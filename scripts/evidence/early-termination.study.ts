/**
 * Study B: Early Termination Correctness
 *
 * Does termination happen at the right time?
 *
 * Hypotheses:
 * B1: When terminating early, the true size is actually < 1 with ≥90% confidence
 * B2: False positive rate (terminate when size > 1) is ≤ 10%
 * B3: False negative rate (keep trying when size = 0) is minimized
 *
 * Method: Create filters with edge-case pass rates (0%, 0.1%, 1%, 10%), track termination decisions.
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
  // Test cases:
  // 0% (true size 0) -> Should terminate
  // 0.05% of 1000 (size 0.5 -> 0) -> Should terminate
  // 0.1% of 1000 (size 1) -> Should NOT terminate
  // 1% of 1000 (size 10) -> Should NOT terminate
  
  const scenarios: EarlyTerminationParams[] = [
    { passRate: 0, baseSize: 100 },       // Smaller base size -> faster termination
    { passRate: 0, baseSize: 1000 },
    { passRate: 0.0005, baseSize: 1000 }, // 0.5 -> 0
    { passRate: 0.001, baseSize: 1000 },  // 1
    { passRate: 0.002, baseSize: 1000 },  // 2
    { passRate: 0.01, baseSize: 1000 },   // 10
    { passRate: 0.1, baseSize: 1000 }     // 100
  ]

  const runner = new ExperimentRunner<EarlyTerminationParams, EarlyTerminationResult>({
    name: 'Early Termination Correctness Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/early-termination.csv'),
    csvHeader: [
      'trial_id', 'seed', 'pass_rate', 'base_size', 'true_size', 
      'samples_taken', 'terminated', 'estimated_size', 'ci_upper', 
      'false_termination', 'failed_termination'
    ],
    trialsPerConfig: getSampleSize(200, 50),
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
