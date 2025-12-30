/**
 * Study A: Convergence Dynamics
 *
 * How quickly does the CI converge to its target coverage as samples accumulate?
 *
 * Hypotheses:
 * A1: Coverage ≥90% for all warmup counts ≥50
 * A2: CI width decreases as O(1/√n) (theoretical convergence rate)
 * A3: Point estimate mean absolute error decreases as O(1/√n)
 *
 * Method: Independent trials per warmup count (avoids sequential testing bias).
 * For each warmup count w ∈ {10, 25, 50, 100, 200, 500}:
 *   - Run 500 independent trials
 *   - Each trial: create fresh FilteredArbitrary, sample exactly w times, measure CI
 *
 * FIXED: Previous version had sequential testing bias (multiple checkpoints in same trial).
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, CSVWriter, ProgressReporter } from './runner.js'
import path from 'path'

interface CIConvergenceResult {
  trialId: number
  seed: number
  passRate: number
  warmupCount: number
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
  warmupCount: number
}

function runTrial(
  params: CIConvergenceParams,
  trialId: number,
  indexInConfig: number
): CIConvergenceResult {
  const { passRate, warmupCount } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const baseSize = 1000
  // Use deterministic modular selection for exact true size
  const threshold = Math.floor(baseSize * passRate)
  // Ensure true size is at least 1 unless passRate is 0
  const actualTrueSize = passRate > 0 && threshold === 0 ? 1 : threshold

  // Create fresh FilteredArbitrary for this trial (independent trials)
  const arb = fc.integer(0, baseSize - 1).filter(x => x < actualTrueSize)

  // Sample exactly warmupCount times
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

  const ciWidth = ciUpper - ciLower
  const trueInCI = actualTrueSize >= ciLower && actualTrueSize <= ciUpper
  const relativeError = actualTrueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - actualTrueSize) / actualTrueSize

  return {
    trialId,
    seed,
    passRate,
    warmupCount,
    trueSize: actualTrueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    ciWidth,
    trueInCI,
    relativeError
  }
}

async function runCIConvergenceStudy(): Promise<void> {
  // Pass rates to test
  const passRates = [0.1, 0.3, 0.5, 0.7, 0.9]

  // Warmup counts to test (independent trials for each)
  const warmupCounts = [10, 25, 50, 100, 200, 500]

  // Create all combinations (Cartesian product)
  const params: CIConvergenceParams[] = []
  for (const passRate of passRates) {
    for (const warmupCount of warmupCounts) {
      params.push({ passRate, warmupCount })
    }
  }

  // Total: 5 pass rates × 6 warmup counts = 30 configurations
  // With 500 trials each = 15,000 independent trials

  const runner = new ExperimentRunner<CIConvergenceParams, CIConvergenceResult>({
    name: 'CI Convergence Dynamics Study (Independent Trials)',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/ci-convergence.csv'),
    csvHeader: [
      'trial_id', 'seed', 'pass_rate', 'warmup_count', 'true_size',
      'estimated_size', 'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci',
      'relative_error'
    ],
    trialsPerConfig: getSampleSize(500, 100), // 500 trials per config (sufficient for 80% power)
    resultToRow: (r: CIConvergenceResult) => [
      r.trialId, r.seed, r.passRate, r.warmupCount, r.trueSize,
      r.estimatedSize, r.ciLower.toFixed(2), r.ciUpper.toFixed(2),
      r.ciWidth.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  await runner.run(params, (p, id, idx) => runTrial(p, id, idx))
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
