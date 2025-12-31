/**
 * Study C: Adversarial Filter Patterns
 *
 * Does CI calibration hold for non-uniform, structured filter patterns?
 *
 * Hypotheses:
 * C1: Clustered acceptance maintains coverage ≥90%
 * C2: Modular patterns maintain coverage ≥90%
 * C3: Magnitude-dependent patterns maintain coverage ≥90%
 * C4: Bit-pattern patterns maintain coverage ≥90%
 * C5: Hash-based deterministic patterns maintain coverage ≥90%
 *
 * All filters are deterministic and have computable ground truth.
 * This fixes the non-deterministic Math.random() and expensive isPrime() from previous version.
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

// Count number of 1-bits in binary representation (population count)
function popcount(n: number): number {
  let count = 0
  while (n) {
    count += n & 1
    n >>>= 1
  }
  return count
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
  const scenarios: AdversarialParams[] = [
    // C1: Clustered Acceptance (10% pass rate, all in first 10% of range)
    {
      scenario: 'clustered_10pct',
      baseSize: 1000,
      predicate: (x: number) => x < 100,
      getTrueSize: () => 100 // Exactly 100 values (0-99)
    },

    // C2: Modular Pattern (~50% pass rate, even numbers)
    {
      scenario: 'modulo_even',
      baseSize: 1000,
      predicate: (x: number) => x % 2 === 0,
      getTrueSize: () => 500 // Exactly 500 even numbers (0, 2, 4, ..., 998)
    },

    // C3: Magnitude-Dependent (biased pass rate)
    {
      scenario: 'magnitude_dependent',
      baseSize: 1000,
      predicate: (x: number) => x < 100 || (x >= 500 && x < 550),
      getTrueSize: () => 150 // 100 + 50 = 150 values
    },

    // C4: Bit-Pattern Dependent (~50% pass rate)
    {
      scenario: 'bit_pattern_even',
      baseSize: 1024, // Power of 2 for clean analysis
      predicate: (x: number) => popcount(x) % 2 === 0,
      getTrueSize: () => 512 // Exactly half (balanced binary function)
    },

    // C5: Hash-Based Pseudo-Random (30% pass rate, deterministic)
    {
      scenario: 'hash_30pct',
      baseSize: 1000,
      predicate: (x: number) => ((x * 2654435761) >>> 0) % 100 < 30,
      getTrueSize: (bs: number) => {
        // Compute exact count via exhaustive enumeration (one-time)
        let count = 0
        for (let i = 0; i < bs; i++) {
          if (((i * 2654435761) >>> 0) % 100 < 30) count++
        }
        return count
      }
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
