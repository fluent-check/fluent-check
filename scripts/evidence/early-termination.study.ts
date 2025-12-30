/**
 * Study B: Early Termination Correctness
 *
 * Does the early termination decision rule make correct decisions?
 *
 * Background:
 * FilteredArbitrary stops trying when: baseSize * sizeEstimation.inv(0.95) < 1
 * This uses the 95th percentile of the posterior over pass rates (one-sided).
 *
 * Hypotheses:
 * B1: When decision rule triggers (95th percentile estimate < 1), true size < 1 in ≥95% of cases
 *     (Rationale: 95th percentile should have 5% false positive rate by definition)
 * B2: False negative rate (continue trying when true size = 0) ≤ 50%
 *     (Rationale: Acceptable to waste effort, but should terminate eventually)
 * B3: For filters with true size ≥ 10, early termination never triggers
 *     (Rationale: Decision rule should only stop for genuinely empty/tiny spaces)
 *
 * Method: Create filters with known true sizes: 0, 1, 5, 10, 50, 100
 * Measure: P(true size < 1 | early termination), P(early termination | true size = 0)
 *
 * FIXED: Previous version confused decision rule (95th percentile) with calibration question.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface EarlyTerminationResult {
  trialId: number
  seed: number
  passRate: number
  baseSize: number
  trueSize: number
  samplesTaken: number
  terminated: boolean
  estimatedSize: number
  ciUpper: number
  falseTermination: boolean // Terminated but true size >= 1
  failedTermination: boolean // Did not terminate but true size < 1 (actually impossible since size is integer, so <1 means 0)
}

interface EarlyTerminationParams {
  passRate: number
  baseSize: number
}

function runTrial(
  params: EarlyTerminationParams,
  trialId: number,
  indexInConfig: number
): EarlyTerminationResult {
  const { passRate, baseSize } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  // Use deterministic modular selection
  // If passRate is very small (e.g. 0.0001), threshold might be 0
  const threshold = Math.floor(baseSize * passRate)
  const trueSize = threshold

  const arb = fc.integer(0, baseSize - 1).filter(x => x < threshold)
  
  // Simulate the loop in FilteredArbitrary
  // We want to see when/if it terminates
  
  const maxSamples = 5000 // Limit to avoid infinite loops in simulation
  let samplesTaken = 0
  let terminated = false
  let ciUpper = 1.0 // Initial upper bound is 1.0 (100%)

  for (let i = 0; i < maxSamples; i++) {
    // Check termination condition: baseSize * upperCI < 1
    // Note: The actual code might use sizeEstimation.inv which handles the beta distribution logic.
    // Here we access arb.size() which returns the computed CI.
    
    const sizeInfo = arb.size()
    
    if (sizeInfo.type === 'estimated') {
      ciUpper = sizeInfo.credibleInterval[1]
    } else {
      // Exact size known, shouldn't happen for filter unless exhausted?
      // Actually filter returns estimated size.
      // If exact, we are done.
      break; 
    }

    // condition: while (baseSize * upperCI >= 1) continue;
    // so if (baseSize * upperCI < 1) terminate;
    
    if (baseSize * ciUpper < 1) {
      terminated = true
      break
    }

    // Take a sample
    const pick = arb.pick(generator)
    if (pick === undefined) {
      terminated = true
      break
    }
    samplesTaken++
  }

  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  if (sizeInfo.type === 'estimated') {
    ciUpper = sizeInfo.credibleInterval[1]
  }

  const falseTermination = terminated && trueSize >= 1
  const failedTermination = !terminated && trueSize < 1 && samplesTaken >= maxSamples

  return {
    trialId,
    seed,
    passRate,
    baseSize,
    trueSize,
    samplesTaken,
    terminated,
    estimatedSize,
    ciUpper,
    falseTermination,
    failedTermination
  }
}

async function runEarlyTerminationStudy(): Promise<void> {
  // Test cases with known true sizes: 0, 1, 5, 10, 50, 100
  // We use small base sizes for exact control

  const scenarios: EarlyTerminationParams[] = [
    // True size 0 (impossible filter)
    { passRate: 0, baseSize: 100 },

    // True size 1 (exactly one value passes)
    { passRate: 0.01, baseSize: 100 },  // 100 * 0.01 = 1

    // True size 5
    { passRate: 0.05, baseSize: 100 },  // 100 * 0.05 = 5

    // True size 10
    { passRate: 0.1, baseSize: 100 },   // 100 * 0.1 = 10

    // True size 50
    { passRate: 0.5, baseSize: 100 },   // 100 * 0.5 = 50

    // True size 100 (all values pass)
    { passRate: 1.0, baseSize: 100 },   // 100 * 1.0 = 100

    // Edge case: Very rare filter (0.1% pass rate)
    { passRate: 0.001, baseSize: 1000 } // 1000 * 0.001 = 1
  ]

  const runner = new ExperimentRunner<EarlyTerminationParams, EarlyTerminationResult>({
    name: 'Early Termination Correctness Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/early-termination.csv'),
    csvHeader: [
      'trial_id', 'seed', 'pass_rate', 'base_size', 'true_size', 
      'samples_taken', 'terminated', 'estimated_size', 'ci_upper', 
      'false_termination', 'failed_termination'
    ],
    trialsPerConfig: getSampleSize(500, 100), // 500 trials for 80% power
    resultToRow: (r: EarlyTerminationResult) => [
      r.trialId, r.seed, r.passRate, r.baseSize, r.trueSize,
      r.samplesTaken, r.terminated, r.estimatedSize, r.ciUpper.toFixed(4),
      r.falseTermination, r.failedTermination
    ]
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEarlyTerminationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runEarlyTerminationStudy }
