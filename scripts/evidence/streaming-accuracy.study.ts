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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32 } from './runner.js'
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

function runTrial(
  trialId: number,
  n: number,
  threshold: number
): AccuracyResult {
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
  console.log('=== Streaming Statistics Accuracy Study ===')
  console.log('Hypothesis: Bayesian confidence is calibrated within 5% for n > 100.\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/streaming-accuracy.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'n',
    'true_p',
    'threshold',
    'successes',
    'confidence',
    'truth'
  ])

  // Study parameters
  const threshold = 0.90 // Use 0.90 to get more interesting mix of true/false near boundary
  const sampleSizes = [100, 500, 1000]
  // We need MANY trials to get good histograms for calibration
  const trialsPerConfig = getSampleSize(10000, 500) 
  const totalTrials = sampleSizes.length * trialsPerConfig

  console.log(`Threshold: ${threshold}`)
  console.log(`Sample sizes: ${sampleSizes.join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'StreamingAccuracy')

  let trialId = 0
  for (const n of sampleSizes) {
    for (let i = 0; i < trialsPerConfig; i++) {
      const result = runTrial(trialId, n, threshold)
      writer.writeRow([
        result.trialId,
        result.seed,
        result.n,
        result.trueP,
        result.threshold,
        result.successes,
        result.confidence,
        result.truth
      ])
      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Streaming Accuracy study complete`)
  console.log(`  Output: ${outputPath}`)
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
