/**
 * Streaming Statistics Accuracy Study: Calibration of Bayesian Confidence
 *
 * Tests whether the reported confidence levels from calculateBayesianConfidence
 * correspond to the actual frequency of the property holding true.
 *
 * Method:
 * 1. Sample true_p ~ Uniform[0, 1]
 * 2. Simulate n Bernoulli trials with probability true_p
 * 3. Calculate confidence that p > threshold
 * 4. Check if (p > threshold) is actually true
 * 5. Group by confidence level and compare predicted vs observed frequency
 */

import { calculateBayesianConfidence } from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface AccuracyResult {
  trialId: number
  seed: number
  n: number
  trueP: number
  threshold: number
  successes: number
  confidence: number
  truth: boolean // trueP > threshold
}

interface StreamingAccuracyParams {
  n: number
  threshold: number
}

function runTrial(
  params: StreamingAccuracyParams,
  trialId: number
): AccuracyResult {
  const { n, threshold } = params
  const seed = getSeed(trialId)
  const rng = mulberry32(seed)
  
  // 1. Sample true_p from Uniform[0, 1]
  const trueP = rng()
  
  // 2. Simulate n trials
  let successes = 0
  for (let i = 0; i < n; i++) {
    if (rng() < trueP) {
      successes++
    }
  }
  
  // 3. Calculate confidence that trueP > threshold
  const confidence = calculateBayesianConfidence(successes, n - successes, threshold)
  
  // 4. Check truth
  const truth = trueP > threshold
  
  return {
    trialId,
    seed,
    n,
    trueP,
    threshold,
    successes,
    confidence,
    truth
  }
}

async function runStreamingAccuracyStudy(): Promise<void> {
  const threshold = 0.90 // Use 0.90 to get more interesting mix of true/false near boundary
  const sampleSizes = [100, 500, 1000]
  
  const parameters: StreamingAccuracyParams[] = sampleSizes.map(n => ({
    n,
    threshold
  }))

  const runner = new ExperimentRunner<StreamingAccuracyParams, AccuracyResult>({
    name: 'Streaming Statistics Accuracy Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/streaming-accuracy.csv'),
    csvHeader: [
      'trial_id', 'seed', 'n', 'true_p', 'threshold', 'successes', 'confidence', 'truth'
    ],
    trialsPerConfig: getSampleSize(10000, 500),
    resultToRow: (r: AccuracyResult) => [
      r.trialId, r.seed, r.n, r.trueP, r.threshold, r.successes, r.confidence, r.truth
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Bayesian confidence is calibrated within 5% for n > 100.\n')
      console.log(`Threshold: ${threshold}`)
      console.log(`Sample sizes: ${sampleSizes.join(', ')}`)
    }
  })

  await runner.run(parameters, runTrial)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runStreamingAccuracyStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runStreamingAccuracyStudy }
