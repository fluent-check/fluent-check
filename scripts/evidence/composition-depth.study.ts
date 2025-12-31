/**
 * Study D: Composition Depth Impact
 *
 * Question: Does coverage degrade with nesting depth, and how does precision change?
 *
 * SEPARATED HYPOTHESES (Calibration vs Precision):
 *
 * Calibration:
 * - D1: Coverage ≥ 90% for depth ≤ 3
 * - D2: Coverage ≥ 85% for depth ≤ 5
 * - D3: Coverage ≤ 99% for all depths (not excessively conservative)
 *
 * Precision:
 * - D4: Width growth ≤ 2× per composition level
 * - D5: Median relative width ≤ 2× oracle width
 *
 * Oracle Baseline:
 * - True Bayesian propagation via Monte Carlo sampling from Beta posteriors
 * - This represents the theoretically optimal interval propagation
 *
 * Method: Create nested filtered arbitraries, measure coverage and width at each depth.
 * Compare interval arithmetic (production) against oracle (Monte Carlo).
 *
 * ===========================================================================
 * POWER ANALYSIS
 * ===========================================================================
 *
 * This study measures COVERAGE (proportion of trials where true value falls
 * within the credible interval). We want to detect if coverage deviates
 * from the 90% target at different composition depths.
 *
 * Parameters (configurable below):
 * - Target proportion: 90% (the CI coverage target)
 * - Minimum detectable deviation: 5% (detect if coverage is 85% or 95%)
 * - Significance level (α): 0.05 (two-sided)
 * - Statistical power: 95%
 *
 * With these parameters:
 * - Required sample size: ~564 trials per configuration
 * - We use 2,000 for margin and consistency with other studies
 * - Expected 95% CI half-width: ±1.32%
 *
 * Reference table (for 90% target, α=0.05):
 * | Detect | Power 80% | Power 95% | Power 99% |
 * |--------|-----------|-----------|-----------|
 * | ±5%    | 341       | 564       | 797       |
 * | ±3%    | 885       | 1,464     | 2,070     |
 * | ±2%    | 1,918     | 3,175     | 4,488     |
 */

import * as fc from '../../src/index.js'
import { BetaDistribution } from '../../src/statistics.js'
import {
  ExperimentRunner,
  getSeed,
  getSampleSize,
  mulberry32,
  calculateRequiredSampleSize,
  printPowerAnalysis,
  type PowerAnalysisParams
} from './runner.js'
import path from 'path'

// =============================================================================
// STUDY CONFIGURATION
// =============================================================================

/**
 * Power analysis parameters for this study.
 * Adjust these to change the statistical rigor of the study.
 */
const POWER_ANALYSIS: PowerAnalysisParams = {
  /** Target coverage proportion (90% CI should contain true value 90% of the time) */
  targetProportion: 0.90,

  /** Minimum deviation from target we want to detect (e.g., 0.05 = detect 85% vs 90%) */
  minDetectableDeviation: 0.05,

  /** Significance level for hypothesis tests */
  alpha: 0.05,

  /** Statistical power (probability of detecting a true effect) */
  power: 0.95
}

/**
 * Calculate required sample size based on power analysis.
 * In quick mode, use a smaller sample for faster iteration.
 */
const powerResult = calculateRequiredSampleSize(POWER_ANALYSIS)
const TRIALS_PER_CONFIG = getSampleSize(
  // Full mode: use power-analysis-derived sample size, rounded up for margin
  Math.max(powerResult.requiredSampleSize, 2000),
  // Quick mode: smaller sample for fast iteration
  100
)

// =============================================================================
// STUDY PARAMETERS
// =============================================================================

/** Depths to test (product of 1 to 5 filtered arbitraries) */
const DEPTHS = [1, 2, 3, 4, 5]

/** Base size for each filter level */
const BASE_SIZE = 100

/** Pass rate for each filter (50% for maximum uncertainty) */
const PASS_RATE = 0.5

/** Number of warmup samples per trial */
const WARMUP_COUNT = 200

/** Number of Monte Carlo samples for oracle CI */
const ORACLE_SAMPLES = 10000

// =============================================================================
// TYPES
// =============================================================================

interface DepthResult {
  trialId: number
  seed: number
  depth: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  ciWidth: number
  relativeWidth: number
  trueInCI: boolean
  relativeError: number
  // Oracle comparison
  oracleLower: number
  oracleUpper: number
  oracleWidth: number
  trueInOracle: boolean
  widthRatioVsOracle: number
}

interface DepthParams {
  depth: number
}

// =============================================================================
// ORACLE COMPUTATION
// =============================================================================

/**
 * Compute oracle CI via Monte Carlo sampling from Beta posteriors.
 * This represents the theoretically optimal interval propagation.
 */
function computeOracleCI(
  passRates: { alpha: number; beta: number }[],
  baseSize: number,
  numSamples: number = ORACLE_SAMPLES
): { lower: number; upper: number } {
  const samples: number[] = []

  for (let i = 0; i < numSamples; i++) {
    let size = baseSize
    for (const { alpha, beta } of passRates) {
      // Sample from Beta posterior
      const betaDist = new BetaDistribution(alpha, beta)
      // Use inverse CDF to sample
      const u = Math.random()
      const passRate = betaDist.inv(u)
      size *= passRate
    }
    samples.push(size)
  }

  samples.sort((a, b) => a - b)
  const lower = samples[Math.floor(numSamples * 0.05)]
  const upper = samples[Math.floor(numSamples * 0.95)]

  return { lower, upper }
}

// =============================================================================
// TRIAL EXECUTION
// =============================================================================

function runTrial(
  params: DepthParams,
  trialId: number,
  indexInConfig: number
): DepthResult {
  const { depth } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  // Create nested filtered arbitraries (product of independent filters)
  // Each filter has 50% pass rate for maximum uncertainty
  const threshold = Math.floor(BASE_SIZE * PASS_RATE)

  // Build the nested structure: tuple of filtered integers
  // Depth 1: filter(x < 50) -> true size = 50
  // Depth 2: tuple(filter, filter) -> true size = 50 * 50 = 2500
  // Depth 3: tuple(depth2, filter) -> true size = 2500 * 50 = 125000
  // etc.

  let arb: fc.Arbitrary<unknown> = fc.integer(0, BASE_SIZE - 1).filter(x => x < threshold)
  let trueSize = threshold

  for (let d = 1; d < depth; d++) {
    const newFilter = fc.integer(0, BASE_SIZE - 1).filter(x => x < threshold)
    arb = fc.tuple(arb, newFilter)
    trueSize *= threshold
  }

  // Warmup - sample enough to get stable estimates
  for (let i = 0; i < WARMUP_COUNT; i++) {
    try {
      arb.pick(generator)
    } catch {
      // Ignore exhaustion
    }
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
  const relativeWidth = trueSize > 0 ? ciWidth / trueSize : ciWidth
  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper
  const relativeError = trueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - trueSize) / trueSize

  // Compute oracle CI
  // After warmup, each filter has approximately observed: successes ~ warmup * passRate
  // For simplicity, assume all filters have similar posteriors
  // In reality, we'd need to track each filter's actual alpha/beta
  // Approximation: Each filter has Beta(2 + warmup*passRate, 1 + warmup*(1-passRate))
  const approxAlpha = 2 + WARMUP_COUNT * PASS_RATE
  const approxBeta = 1 + WARMUP_COUNT * (1 - PASS_RATE)

  const filterPosteriors: { alpha: number; beta: number }[] = []
  for (let d = 0; d < depth; d++) {
    filterPosteriors.push({ alpha: approxAlpha, beta: approxBeta })
  }

  const oracle = computeOracleCI(filterPosteriors, BASE_SIZE ** depth)
  const oracleWidth = oracle.upper - oracle.lower
  const trueInOracle = trueSize >= oracle.lower && trueSize <= oracle.upper
  const widthRatioVsOracle = oracleWidth > 0 ? ciWidth / oracleWidth : 1

  return {
    trialId,
    seed,
    depth,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    ciWidth,
    relativeWidth,
    trueInCI,
    relativeError,
    oracleLower: oracle.lower,
    oracleUpper: oracle.upper,
    oracleWidth,
    trueInOracle,
    widthRatioVsOracle
  }
}

// =============================================================================
// MAIN STUDY
// =============================================================================

async function runDepthStudy(): Promise<void> {
  const scenarios: DepthParams[] = DEPTHS.map(depth => ({ depth }))

  const totalConfigs = DEPTHS.length
  const totalTrials = totalConfigs * TRIALS_PER_CONFIG

  const runner = new ExperimentRunner<DepthParams, DepthResult>({
    name: 'Composition Depth Impact Study (Calibration vs Precision)',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/composition-depth.csv'),
    csvHeader: [
      'trial_id', 'seed', 'depth', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'ci_width', 'relative_width', 'true_in_ci', 'relative_error',
      'oracle_lower', 'oracle_upper', 'oracle_width', 'true_in_oracle', 'width_ratio_vs_oracle'
    ],
    trialsPerConfig: TRIALS_PER_CONFIG,
    resultToRow: (r: DepthResult) => [
      r.trialId, r.seed, r.depth, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.ciWidth.toFixed(2),
      r.relativeWidth.toFixed(4), r.trueInCI, r.relativeError.toFixed(6),
      r.oracleLower.toFixed(2), r.oracleUpper.toFixed(2), r.oracleWidth.toFixed(2),
      r.trueInOracle, r.widthRatioVsOracle.toFixed(4)
    ],
    preRunInfo: () => {
      console.log('Study D: Composition Depth Impact')
      console.log('=' .repeat(60))
      console.log('')
      printPowerAnalysis(powerResult)
      console.log('')
      console.log('Study Design:')
      console.log(`  Depths: ${DEPTHS.join(', ')}`)
      console.log(`  Base size: ${BASE_SIZE}`)
      console.log(`  Pass rate: ${PASS_RATE * 100}%`)
      console.log(`  Warmup samples: ${WARMUP_COUNT}`)
      console.log(`  Oracle MC samples: ${ORACLE_SAMPLES}`)
      console.log(`  Configurations: ${totalConfigs}`)
      console.log(`  Trials per config: ${TRIALS_PER_CONFIG}`)
      console.log(`  Total trials: ${totalTrials.toLocaleString()}`)
      console.log('')
    }
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

// =============================================================================
// ENTRY POINT
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runDepthStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runDepthStudy, POWER_ANALYSIS, TRIALS_PER_CONFIG }
