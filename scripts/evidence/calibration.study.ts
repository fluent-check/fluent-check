/**
 * Calibration Study: How reliable is confidence-based termination?
 * 
 * Tests whether the system correctly identifies when pass rate exceeds threshold.
 * 
 * IMPORTANT: FluentCheck treats property failures as counterexamples.
 * - If pass_rate < 100%, running enough tests WILL find a failure (correct behavior)
 * - Terminating with "confidence" means no failure was found AND confidence was achieved
 * 
 * What we measure:
 * 1. TRUE POSITIVE: pass_rate > threshold, terminates with confidence (correct)
 * 2. FALSE NEGATIVE: pass_rate > threshold, finds "bug" before confidence (spurious failure)
 * 3. TRUE NEGATIVE: pass_rate < threshold, finds bug (correct)
 * 4. FALSE POSITIVE: pass_rate < threshold, terminates with confidence (incorrect!)
 * 
 * This is sensitivity/specificity analysis, not traditional calibration.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface CalibrationResult {
  trialId: number
  seed: number
  testsRun: number
  bugFound: boolean
  claimedConfidence: number
  truePassRate: number
  threshold: number
  targetConfidence: number
  thresholdActuallyMet: boolean
  terminationReason: string
  elapsedMicros: number
  // Classification
  outcome: 'TP' | 'FN' | 'TN' | 'FP'
}

interface CalibrationParams {
  truePassRate: number
  threshold: number
  targetConfidence: number
}

/**
 * Run a single calibration trial
 */
function runTrial(
  params: CalibrationParams,
  trialId: number,
  indexInConfig: number
): CalibrationResult {
  const { truePassRate, threshold, targetConfidence } = params
  const seed = getSeed(indexInConfig) // Use index in config for consistent seed
  const timer = new HighResTimer()

  // Create a property with known pass rate
  const failureRate = 1 - truePassRate
  const failAt = failureRate > 0 ? Math.floor(1 / failureRate) : 0 // 0 means never fail

  const result = fc.scenario()
    .config(fc.strategy()
      .withConfidence(targetConfidence)
      .withPassRateThreshold(threshold)
      .withMaxIterations(10000)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(1, 100000))
    .then(({ x }) => failAt === 0 || x % failAt !== 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  // Ground truth
  const thresholdActuallyMet = truePassRate > threshold
  const bugFound = !result.satisfiable

  // Determine termination reason
  let terminationReason: string
  if (bugFound) {
    terminationReason = 'bugFound'
  } else if (result.statistics.confidence && result.statistics.confidence >= targetConfidence) {
    terminationReason = 'confidence'
  } else {
    terminationReason = 'maxIterations'
  }

  // Classify outcome (for sensitivity/specificity)
  let outcome: 'TP' | 'FN' | 'TN' | 'FP'
  if (thresholdActuallyMet) {
    // Threshold IS met - we WANT to terminate with confidence
    outcome = bugFound ? 'FN' : 'TP' // FN = spurious failure, TP = correct confidence
  } else {
    // Threshold NOT met - we WANT to find bug
    outcome = bugFound ? 'TN' : 'FP' // TN = correct bug found, FP = false confidence
  }

  return {
    trialId,
    seed,
    testsRun: result.statistics.testsRun,
    bugFound,
    claimedConfidence: result.statistics.confidence ?? 0,
    truePassRate,
    threshold,
    targetConfidence,
    thresholdActuallyMet,
    terminationReason,
    elapsedMicros,
    outcome
  }
}

/**
 * Run calibration study
 */
async function runCalibrationStudy(): Promise<void> {
  // Study parameters
  // Test both cases: threshold met and threshold not met
  // Use threshold = 0.95 as the decision boundary
  const threshold = 0.95
  
  const scenarios = [
    // Threshold CLEARLY met (should achieve confidence, TP expected)
    { truePassRate: 1.000, label: 'perfect' },        // 100% - always passes
    { truePassRate: 0.999, label: 'near_perfect' },   // 99.9% - very rare failures
    { truePassRate: 0.99, label: 'excellent' },       // 99% - rare failures
    { truePassRate: 0.97, label: 'good' },            // 97% - occasional failures
    
    // Threshold BARELY met (harder to distinguish)
    { truePassRate: 0.96, label: 'borderline_above' }, // Just above threshold
    
    // Threshold NOT met (should find bugs, TN expected)
    { truePassRate: 0.94, label: 'borderline_below' }, // Just below threshold
    { truePassRate: 0.90, label: 'below' },            // 10% failure rate
    { truePassRate: 0.80, label: 'well_below' }        // 20% failure rate
  ]

  const confidenceLevels = [0.90, 0.95, 0.99]
  
  // Flatten parameters
  const parameters: CalibrationParams[] = []
  for (const scenario of scenarios) {
    for (const targetConfidence of confidenceLevels) {
      parameters.push({
        truePassRate: scenario.truePassRate,
        threshold,
        targetConfidence
      })
    }
  }

  const runner = new ExperimentRunner<CalibrationParams, CalibrationResult>({
    name: 'Calibration Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/calibration.csv'),
    csvHeader: [
      'trial_id', 'seed', 'tests_run', 'bug_found', 'claimed_confidence',
      'true_pass_rate', 'threshold', 'target_confidence',
      'threshold_actually_met', 'termination_reason', 'elapsed_micros', 'outcome'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: CalibrationResult) => [
      r.trialId, r.seed, r.testsRun, r.bugFound, r.claimedConfidence.toFixed(6),
      r.truePassRate, r.threshold, r.targetConfidence,
      r.thresholdActuallyMet, r.terminationReason, r.elapsedMicros, r.outcome
    ],
    preRunInfo: () => {
      console.log('Tests sensitivity/specificity of confidence-based termination\n')
      console.log(`Decision threshold: ${threshold} (asking "is pass_rate > ${threshold*100}%?")\n`)
      console.log('Scenarios:')
      for (const s of scenarios) {
        const met = s.truePassRate > threshold ? '✓ MET' : '✗ NOT MET'
        const margin = ((s.truePassRate - threshold) * 100).toFixed(1)
        console.log(`  - ${s.label}: pass_rate=${(s.truePassRate * 100).toFixed(1)}% [${met}, margin=${margin}%]`)
      }
      console.log(`\nTarget confidence levels: ${confidenceLevels.join(', ')}`)
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCalibrationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runCalibrationStudy }
