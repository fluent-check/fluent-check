/**
 * Study C: Adversarial Filter Patterns
 *
 * Does calibration hold for clustered/patterned data?
 *
 * Hypotheses:
 * C1: Clustered acceptance (every Nth value passes) maintains calibration
 * C2: Patterned rejection (modular arithmetic) maintains calibration
 *
 * Scenarios:
 * - Clustered: (x % 100) < 10 (10% pass rate, but grouped)
 * - Patterned: isPrime(x) (Structured, diminishing density)
 * - Modulo: (x % 7) === 0 (Regular interval)
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface AdversarialResult {
  trialId: number
  seed: number
  scenario: string
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
  relativeError: number
}

interface AdversarialParams {
  scenario: string
  baseSize: number
  predicate: (x: number) => boolean
  getTrueSize: (baseSize: number) => number
}

// Simple primality test
function isPrime(num: number): boolean {
  for(let i = 2, s = Math.sqrt(num); i <= s; i++)
    if(num % i === 0) return false; 
  return num > 1;
}

function runTrial(
  params: AdversarialParams,
  trialId: number,
  indexInConfig: number
): AdversarialResult {
  const { scenario, baseSize, predicate, getTrueSize } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const trueSize = getTrueSize(baseSize)
  const arb = fc.integer(0, baseSize - 1).filter(predicate)
  
  // Warmup
  const warmupCount = 200
  for (let i = 0; i < warmupCount; i++) {
    arb.pick(generator)
  }

  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  
  let ciLower = estimatedSize
  let ciUpper = estimatedSize

  if (sizeInfo.type === 'estimated') {
    ciLower = sizeInfo.credibleInterval[0]
    ciUpper = sizeInfo.credibleInterval[1]
  }

  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper
  const relativeError = trueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - trueSize) / trueSize

  return {
    trialId,
    seed,
    scenario,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI,
    relativeError
  }
}

async function runAdversarialStudy(): Promise<void> {
  const baseSize = 10000
  
  const scenarios: AdversarialParams[] = [
    {
      scenario: 'clustered_10pct',
      baseSize,
      predicate: (x: number) => (x % 100) < 10,
      getTrueSize: (bs: number) => Math.floor(bs / 10) // 10% exactly
    },
    {
      scenario: 'modulo_7',
      baseSize,
      predicate: (x: number) => (x % 7) === 0,
      getTrueSize: (bs: number) => Math.ceil(bs / 7) 
    },
    {
      scenario: 'primes',
      baseSize: 1000, // Smaller base for primes to avoid slow counting
      predicate: isPrime,
      getTrueSize: (bs: number) => {
        // Count primes up to bs-1
        let count = 0
        for (let i = 0; i < bs; i++) {
          if (isPrime(i)) count++
        }
        return count
      }
    },
    {
      scenario: 'block_hole', // Middle 50% is missing
      baseSize,
      predicate: (x: number) => x < baseSize * 0.25 || x >= baseSize * 0.75,
      getTrueSize: (bs: number) => Math.ceil(bs * 0.5)
    }
  ]

  const runner = new ExperimentRunner<AdversarialParams, AdversarialResult>({
    name: 'Adversarial Filter Patterns Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/adversarial-patterns.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'true_in_ci', 'relative_error'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: AdversarialResult) => [
      r.trialId, r.seed, r.scenario, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAdversarialStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runAdversarialStudy }
