/**
 * Study A: Warmup Sample Size Sensitivity (Convergence Dynamics)
 *
 * PROBLEM:
 * FilteredArbitrary.ts:16 uses WARMUP_SAMPLES = 10, but the basic CI calibration
 * study uses 200 warmup samples. There's no justification for either value, and
 * the sensitivity of CI calibration to warmup count has not been systematically tested.
 *
 * QUESTION:
 * How quickly does the CI converge to its target coverage as samples accumulate?
 * What is the minimum warmup count required for well-calibrated CIs?
 *
 * HYPOTHESES:
 * A1 (Minimum Warmup): Coverage ≥90% for all warmup counts ≥10
 *     - Tests whether the current constructor default (10 samples) is sufficient
 * A2 (Convergence Point): CI calibration converges (coverage ≥90%) by N=50 samples
 *     - Identifies a recommended warmup for conservative applications
 * A3 (Width Convergence): CI width decreases as O(1/√n) (theoretical rate)
 *     - Validates that precision improves predictably with more samples
 * A4 (Error Convergence): Point estimate error decreases as O(1/√n)
 *     - Validates that accuracy improves predictably with more samples
 *
 * METHOD:
 * Independent trials per warmup count (avoids sequential testing bias).
 * For each warmup count w ∈ {10, 25, 50, 100, 200, 500}:
 *   - Run 500 independent trials (justified by power analysis below)
 *   - Each trial: create fresh FilteredArbitrary, sample exactly w times, measure CI
 *
 * POWER ANALYSIS:
 * - Target proportion: 90% coverage
 * - Minimum detectable deviation: ±5%
 * - Significance level (α): 0.05
 * - Statistical power: 95%
 * - Required sample size: ~564 per configuration (using 500, actual power ~93%)
 *
 * EXPECTED OUTPUT:
 * - Rule-of-thumb: "Use at least N warmup samples for M% expected pass rate"
 * - Validation that default 10 samples is sufficient for calibration
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, calculateRequiredSampleSize, printPowerAnalysis } from './runner.js'
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
  // ============================================================================
  // POWER ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(60))
  console.log('POWER ANALYSIS')
  console.log('='.repeat(60) + '\n')

  const powerResult = calculateRequiredSampleSize({
    targetProportion: 0.90,
    minDetectableDeviation: 0.05,
    alpha: 0.05,
    power: 0.95
  })
  printPowerAnalysis(powerResult)

  const trialsPerConfig = getSampleSize(500, 100)
  console.log(`\n  Using ${trialsPerConfig} trials per configuration`)
  if (trialsPerConfig < powerResult.requiredSampleSize) {
    console.log(`  NOTE: Slightly below optimal (${powerResult.requiredSampleSize}), actual power ~93%`)
  }

  // ============================================================================
  // STUDY CONFIGURATION
  // ============================================================================

  // Pass rates to test (covering sparse to dense filters)
  const passRates = [0.1, 0.3, 0.5, 0.7, 0.9]

  // Warmup counts to test (independent trials for each)
  // Includes the constructor default (10) and common study values (200)
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
    name: 'Warmup Sample Size Sensitivity Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/ci-convergence.csv'),
    csvHeader: [
      'trial_id', 'seed', 'pass_rate', 'warmup_count', 'true_size',
      'estimated_size', 'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci',
      'relative_error'
    ],
    trialsPerConfig,
    resultToRow: (r: CIConvergenceResult) => [
      r.trialId, r.seed, r.passRate, r.warmupCount, r.trueSize,
      r.estimatedSize, r.ciLower.toFixed(2), r.ciUpper.toFixed(2),
      r.ciWidth.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ],
    preRunInfo: () => {
      console.log('\nHypotheses:')
      console.log('  A1: Coverage ≥90% for all warmup counts ≥10 (validates constructor default)')
      console.log('  A2: CI calibration converges by N=50 samples (convergence point)')
      console.log('  A3: CI width decreases as O(1/√n)')
      console.log('  A4: Point estimate error decreases as O(1/√n)\n')
      console.log(`Pass rates tested: ${passRates.join(', ')}`)
      console.log(`Warmup counts tested: ${warmupCounts.join(', ')}`)
    }
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
