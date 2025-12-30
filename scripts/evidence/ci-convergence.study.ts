/**
 * Study A: Convergence Dynamics
 *
 * Is CI correct at every sample count?
 *
 * Hypotheses:
 * H1: CI width decreases monotonically with sample count
 * H2: CI contains true value at all checkpoints (not just final)
 * H3: Point estimate converges to true value
 *
 * Method: Sample incrementally (1, 5, 10, 25, 50, 100, 200, 500 samples), check CI at each checkpoint.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, CSVWriter, ProgressReporter } from './runner.js'
import path from 'path'

interface CIConvergenceResult {
  trialId: number
  seed: number
  passRate: number
  sampleCount: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  ciWidth: number
  trueInCI: boolean
  relativeError: number
}

interface CIConvergenceParams {
  passRate: number
}

function runTrial(
  params: CIConvergenceParams,
  trialId: number,
  indexInConfig: number
): CIConvergenceResult[] {
  const { passRate } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const baseSize = 1000
  // Use deterministic modular selection for exact true size
  const threshold = Math.floor(baseSize * passRate)
  // Ensure true size is at least 1 unless passRate is 0
  const actualTrueSize = passRate > 0 && threshold === 0 ? 1 : threshold
  
  const arb = fc.integer(0, baseSize - 1).filter(x => x < actualTrueSize)
  
  const checkpoints = [1, 5, 10, 25, 50, 100, 200, 500]
  const results: CIConvergenceResult[] = []

  let samplesTaken = 0
  
  for (const checkpoint of checkpoints) {
    const needed = checkpoint - samplesTaken
    for (let i = 0; i < needed; i++) {
      arb.pick(generator)
    }
    samplesTaken = checkpoint

    const sizeInfo = arb.size()
    const estimatedSize = sizeInfo.value
    
    let ciLower = estimatedSize
    let ciUpper = estimatedSize

    if (sizeInfo.type === 'estimated') {
      ciLower = sizeInfo.credibleInterval[0]
      ciUpper = sizeInfo.credibleInterval[1]
    }

    const ciWidth = ciUpper - ciLower
    const trueInCI = actualTrueSize >= ciLower && actualTrueSize <= ciUpper
    const relativeError = actualTrueSize === 0
      ? (estimatedSize === 0 ? 0 : 1.0)
      : Math.abs(estimatedSize - actualTrueSize) / actualTrueSize

    results.push({
      trialId,
      seed,
      passRate,
      sampleCount: checkpoint,
      trueSize: actualTrueSize,
      estimatedSize,
      ciLower,
      ciUpper,
      ciWidth,
      trueInCI,
      relativeError
    })
  }

  return results
}

async function runCIConvergenceStudy(): Promise<void> {
  const passRates = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]
  const params: CIConvergenceParams[] = passRates.map(p => ({ passRate: p }))

  const runner = new ExperimentRunner<CIConvergenceParams, CIConvergenceResult>({
    name: 'CI Convergence Dynamics Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/ci-convergence.csv'),
    csvHeader: [
      'trial_id', 'seed', 'pass_rate', 'sample_count', 'true_size', 
      'estimated_size', 'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci', 
      'relative_error'
    ],
    trialsPerConfig: getSampleSize(100, 20),
    // We handle row writing manually because runTrial returns multiple rows
    resultToRow: (r: CIConvergenceResult) => [
      r.trialId, r.seed, r.passRate, r.sampleCount, r.trueSize,
      r.estimatedSize, r.ciLower.toFixed(2), r.ciUpper.toFixed(2), 
      r.ciWidth.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  // Override the default run method slightly because our runTrial returns arrays
  // Or we can just flatten the logic.
  // The ExperimentRunner expects runTrial to return TResult.
  // We can change TResult to be an array, but resultToRow expects TResult.
  // Let's manually run it using the same pattern but adapting to the array return.
  
  // Actually, ExperimentRunner is generic. If TResult is an array, resultToRow should handle an array.
  // But CSVWriter.writeRow takes an array of primitives. 
  // Let's modify the usage. ExperimentRunner is simple enough to just use its components or adapt.
  // However, looking at ExperimentRunner.run:
  // writer.writeRow(this.config.resultToRow(result))
  // It expects one row per trial.
  
  // So I should define TResult as CIConvergenceResult[] and resultToRow ... wait, that won't work with writeRow.
  // I will write a custom runner loop here since it's slightly different (multi-row per trial).
  
    console.log(`
  
  
  
  === CI Convergence Dynamics Study ===`)
  
    
  
    const writer = new CSVWriter(path.join(process.cwd(), 'docs/evidence/raw/ci-convergence.csv'))
  
    writer.writeHeader([
  
        'trial_id', 'seed', 'pass_rate', 'sample_count', 'true_size', 
  
        'estimated_size', 'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci', 
  
        'relative_error'
  
    ])
  
  
  
    const trialsPerConfig = getSampleSize(100, 20)
  
    const totalTrials = params.length * trialsPerConfig
  
    const progress = new ProgressReporter(totalTrials, 'CI Convergence')
  
    
  
    let trialId = 0
  for (const p of params) {
    for (let i = 0; i < trialsPerConfig; i++) {
      const results = runTrial(p, trialId, i)
      for (const res of results) {
        writer.writeRow([
          res.trialId, res.seed, res.passRate, res.sampleCount, res.trueSize,
          res.estimatedSize, res.ciLower.toFixed(2), res.ciUpper.toFixed(2), 
          res.ciWidth.toFixed(2), res.trueInCI, res.relativeError.toFixed(6)
        ])
      }
      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()
  
  console.log(`
✓ CI Convergence Study complete`)
  console.log(`  Output: docs/evidence/raw/ci-convergence.csv`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCIConvergenceStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runCIConvergenceStudy }
