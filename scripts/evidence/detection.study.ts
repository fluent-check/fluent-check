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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
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

/**
 * Run a single detection trial with fixed sample size
 */
function runFixedTrial(
  trialId: number,
  sampleSize: number,
  bugFailureRate: number
): DetectionResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Property fails at specific rate
  const failAt = Math.floor(1 / bugFailureRate) // e.g., 0.2% = fail every 500

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(1, 100000))
    .then(({ x }) => x % failAt !== 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    testsRun: result.statistics.testsRun,
    bugFound: !result.satisfiable,
    claimedConfidence: result.statistics.confidence ?? 0,
    method: `fixed_${sampleSize}`,
    bugFailureRate,
    expectedBugPer: 1 / bugFailureRate,
    terminationReason: result.satisfiable ? 'sampleSize' : 'bugFound',
    elapsedMicros
  }
}

/**
 * Run a single detection trial with confidence-based termination
 */
function runConfidenceTrial(
  trialId: number,
  targetConfidence: number,
  bugFailureRate: number
): DetectionResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  const failAt = Math.floor(1 / bugFailureRate)

  // Use threshold slightly below true pass rate to make confidence achievable
  // True pass rate = 1 - bugFailureRate (e.g., 0.998 for 0.2% failure)
  const threshold = (1 - bugFailureRate) - 0.01 // Slightly below true pass rate

  const result = fc.scenario()
    .config(fc.strategy()
      .withConfidence(targetConfidence)
      .withPassRateThreshold(Math.max(0.90, threshold)) // At least 90%
      .withMaxIterations(5000)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(1, 100000))
    .then(({ x }) => x % failAt !== 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  // Determine termination reason
  let terminationReason: string
  if (!result.satisfiable) {
    terminationReason = 'bugFound'
  } else if (result.statistics.confidence && result.statistics.confidence >= targetConfidence) {
    terminationReason = 'confidence'
  } else {
    terminationReason = 'maxIterations'
  }

  return {
    trialId,
    seed,
    testsRun: result.statistics.testsRun,
    bugFound: !result.satisfiable,
    claimedConfidence: result.statistics.confidence ?? 0,
    method: `confidence_${targetConfidence}`,
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
  console.log('\n=== Detection Rate Study ===')
  console.log('Hypothesis: Confidence-based termination finds rare bugs more reliably\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/detection.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'tests_run',
    'bug_found',
    'claimed_confidence',
    'method',
    'bug_failure_rate',
    'expected_bug_per',
    'termination_reason',
    'elapsed_micros'
  ])

  // Bug frequency: 0.2% = 1 in 500 tests
  // This is rare enough that fixed N=100 often misses it
  const bugFailureRate = 0.002 // 0.2% failure rate (1 in 500)

  const trialsPerMethod = getSampleSize(500, 50)

  // Methods to compare - more variety
  const methods = [
    // Fixed sample sizes (traditional)
    { type: 'fixed' as const, value: 50 },   // Very small - low detection
    { type: 'fixed' as const, value: 100 },  // Common default
    { type: 'fixed' as const, value: 200 },  // Moderate
    { type: 'fixed' as const, value: 500 },  // Matches 1/bugRate
    { type: 'fixed' as const, value: 1000 }, // 2x bug rate
    
    // Confidence-based (adaptive)
    { type: 'confidence' as const, value: 0.80 },
    { type: 'confidence' as const, value: 0.90 },
    { type: 'confidence' as const, value: 0.95 },
    { type: 'confidence' as const, value: 0.99 }
  ]

  const totalTrials = methods.length * trialsPerMethod
  console.log(`Bug failure rate: ${bugFailureRate} (1 in ${1/bugFailureRate})`)
  console.log(`\nMethods:`)
  for (const m of methods) {
    if (m.type === 'fixed') {
      // Expected detection rate: 1 - (1-p)^n
      const expectedDetection = 1 - Math.pow(1 - bugFailureRate, m.value)
      console.log(`  - Fixed N=${m.value}: expected detection ~${(expectedDetection * 100).toFixed(1)}%`)
    } else {
      console.log(`  - Confidence ${m.value}: adaptive termination`)
    }
  }
  console.log(`\nTrials per method: ${trialsPerMethod}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'Detection')

  let trialId = 0
  for (const method of methods) {
    for (let i = 0; i < trialsPerMethod; i++) {
      const result = method.type === 'fixed'
        ? runFixedTrial(trialId, method.value, bugFailureRate)
        : runConfidenceTrial(trialId, method.value, bugFailureRate)

      writer.writeRow([
        result.trialId,
        result.seed,
        result.testsRun,
        result.bugFound,
        result.claimedConfidence.toFixed(6),
        result.method,
        result.bugFailureRate,
        result.expectedBugPer,
        result.terminationReason,
        result.elapsedMicros
      ])

      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Detection rate study complete`)
  console.log(`  Output: ${outputPath}`)
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
