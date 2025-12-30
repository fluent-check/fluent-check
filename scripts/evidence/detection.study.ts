/**
 * Detection Rate Study: Does confidence-based termination find more bugs?
 * 
 * Compares bug detection rates between:
 * - Fixed sample sizes (traditional approach)
 * - Confidence-based termination (adaptive approach)
 * 
 * Hypothesis: Confidence-based termination adapts test effort to achieve
 * higher detection rates for rare bugs compared to fixed sample sizes.
 * 
 * We test with different bug frequencies to see how both approaches scale.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface DetectionResult {
  trialId: number
  seed: number
  testsRun: number
  bugFound: boolean
  claimedConfidence: number
  method: string
  bugFailureRate: number
  expectedBugPer: number
  terminationReason: string
  elapsedMicros: number
}

interface DetectionParams {
  type: 'fixed' | 'confidence'
  value: number
  bugFailureRate: number
}

/**
 * Run a single detection trial
 */
function runTrial(
  params: DetectionParams,
  trialId: number,
  indexInConfig: number
): DetectionResult {
  const { type, value, bugFailureRate } = params
  const seed = getSeed(indexInConfig) // Use index in config for consistent seed
  const timer = new HighResTimer()

  const failAt = Math.floor(1 / bugFailureRate)
  let result: fc.FluentResult
  let terminationReason: string
  let method: string

  const strategy = fc.strategy().withRandomGenerator(mulberry32, seed)

  if (type === 'fixed') {
    // Fixed sample size
    method = `fixed_${value}`
    strategy.withSampleSize(value)
    
    result = fc.scenario()
      .config(strategy)
      .forall('x', fc.integer(1, 100000))
      .then(({ x }) => x % failAt !== 0)
      .check()

    terminationReason = result.satisfiable ? 'sampleSize' : 'bugFound'
  } else {
    // Confidence-based
    method = `confidence_${value}`
    const targetConfidence = value
    // Use threshold slightly below true pass rate to make confidence achievable
    const threshold = (1 - bugFailureRate) - 0.01

    strategy
      .withConfidence(targetConfidence)
      .withPassRateThreshold(Math.max(0.90, threshold))
      .withMaxIterations(5000)

    result = fc.scenario()
      .config(strategy)
      .forall('x', fc.integer(1, 100000))
      .then(({ x }) => x % failAt !== 0)
      .check()

    if (!result.satisfiable) {
      terminationReason = 'bugFound'
    } else if (result.statistics.confidence && result.statistics.confidence >= targetConfidence) {
      terminationReason = 'confidence'
    } else {
      terminationReason = 'maxIterations'
    }
  }

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    testsRun: result.statistics.testsRun,
    bugFound: !result.satisfiable,
    claimedConfidence: result.statistics.confidence ?? 0,
    method,
    bugFailureRate,
    expectedBugPer: 1 / bugFailureRate,
    terminationReason,
    elapsedMicros
  }
}

/**
 * Run detection rate study
 */
async function runDetectionStudy(): Promise<void> {
  const bugFailureRate = 0.002 // 0.2% failure rate (1 in 500)

  // Methods to compare
  const methods = [
    // Fixed sample sizes (traditional)
    { type: 'fixed' as const, value: 50 },
    { type: 'fixed' as const, value: 100 },
    { type: 'fixed' as const, value: 200 },
    { type: 'fixed' as const, value: 500 },
    { type: 'fixed' as const, value: 1000 },
    
    // Confidence-based (adaptive)
    { type: 'confidence' as const, value: 0.80 },
    { type: 'confidence' as const, value: 0.90 },
    { type: 'confidence' as const, value: 0.95 },
    { type: 'confidence' as const, value: 0.99 }
  ]

  // Map to parameters
  const parameters: DetectionParams[] = methods.map(m => ({
    ...m,
    bugFailureRate
  }))

  const runner = new ExperimentRunner<DetectionParams, DetectionResult>({
    name: 'Detection Rate Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/detection.csv'),
    csvHeader: [
      'trial_id', 'seed', 'tests_run', 'bug_found', 'claimed_confidence',
      'method', 'bug_failure_rate', 'expected_bug_per', 'termination_reason', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(500, 50),
    resultToRow: (r: DetectionResult) => [
      r.trialId, r.seed, r.testsRun, r.bugFound, r.claimedConfidence.toFixed(6),
      r.method, r.bugFailureRate, r.expectedBugPer, r.terminationReason, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Confidence-based termination finds rare bugs more reliably\n')
      console.log(`Bug failure rate: ${bugFailureRate} (1 in ${1/bugFailureRate})`)
      console.log(`\nMethods:`)
      for (const m of methods) {
        if (m.type === 'fixed') {
          const expectedDetection = 1 - Math.pow(1 - bugFailureRate, m.value)
          console.log(`  - Fixed N=${m.value}: expected detection ~${(expectedDetection * 100).toFixed(1)}%`)
        } else {
          console.log(`  - Confidence ${m.value}: adaptive termination`)
        }
      }
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDetectionStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runDetectionStudy }
