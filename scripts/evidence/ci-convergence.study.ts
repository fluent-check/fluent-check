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
    resultToRow: (r: CIConvergenceResult) => [
      r.trialId, r.seed, r.passRate, r.sampleCount, r.trueSize,
      r.estimatedSize, r.ciLower.toFixed(2), r.ciUpper.toFixed(2), 
      r.ciWidth.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  await runner.runSeries(params, (p, id, idx) => runTrial(p, id, idx))
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
