/**
 * Study H: Beta Prior Comparison
 *
 * Question: Is the Beta(2,1) prior in FilteredArbitrary.ts:11 justified?
 *
 * Background:
 * FilteredArbitrary uses Beta(2,1) as the prior for pass rate estimation.
 * Code comment says "use 1,1 for .mean instead of .mode in point estimation"
 * but it actually uses (2,1) — a biased prior toward high pass rates.
 *
 * Priors to compare:
 * - Beta(2,1): mode at 1.0 (expects filter to pass everything) - CURRENT
 * - Beta(1,1): uniform prior (non-informative) - Equivalent to no prior info
 * - Beta(0.5,0.5): Jeffreys prior (scale-invariant) - Theoretically optimal for unknown proportion
 *
 * Hypotheses:
 * H1: All priors achieve coverage ≥90% asymptotically (at high sample counts)
 * H2: Beta(2,1) converges slower for low true pass rates
 * H3: Jeffreys prior has best calibration across all pass rates
 * H4: Uniform prior Beta(1,1) provides best balance of bias and variance
 *
 * Method:
 * For each prior × pass_rate × warmup_count combination:
 *   - Create custom FilteredArbitrary with specified prior
 *   - Run N independent trials (N determined by power analysis)
 *   - Measure coverage, CI width, bias, and mean absolute error
 *
 * ===========================================================================
 * POWER ANALYSIS
 * ===========================================================================
 *
 * This study measures COVERAGE (proportion of trials where true value falls
 * within the credible interval). We want to detect if coverage deviates
 * from the 90% target.
 *
 * Parameters (configurable below):
 * - Target proportion: 90% (the CI coverage target)
 * - Minimum detectable deviation: 3% (detect if coverage is 87% or 93%)
 * - Significance level (α): 0.05 (two-sided)
 * - Statistical power: 95%
 *
 * With these parameters:
 * - Required sample size: ~1,464 trials per configuration
 * - We use 2,000 for margin and round numbers
 * - Expected 95% CI half-width: ±1.32%
 *
 * Reference table (for 90% target, α=0.05):
 * | Detect | Power 80% | Power 95% | Power 99% |
 * |--------|-----------|-----------|-----------|
 * | ±5%    | 341       | 564       | 797       |
 * | ±3%    | 885       | 1,464     | 2,070     |
 * | ±2%    | 1,918     | 3,175     | 4,488     |
 * | ±1%    | 7,373     | 12,206    | 17,257    |
 */

import * as fc from '../../src/index.js'
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
import { BetaDistribution } from '../../src/statistics.js'

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

  /** Minimum deviation from target we want to detect (e.g., 0.03 = detect 87% vs 90%) */
  minDetectableDeviation: 0.03,

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

/** Priors to compare */
const PRIORS = [
  { alpha: 2, beta: 1, name: 'Beta(2,1)_current' },      // Current implementation
  { alpha: 1, beta: 1, name: 'Beta(1,1)_uniform' },      // Uniform (non-informative)
  { alpha: 0.5, beta: 0.5, name: 'Beta(0.5,0.5)_jeffreys' }, // Jeffreys prior
] as const

/** Pass rates to test (including sparse cases where prior matters most) */
const PASS_RATES = [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9]

/** Warmup counts to test (showing convergence behavior) */
const WARMUP_COUNTS = [10, 25, 50, 100, 200, 500]

// =============================================================================
// TYPES
// =============================================================================

interface BetaPriorResult {
  trialId: number
  seed: number
  priorAlpha: number
  priorBeta: number
  priorName: string
  passRate: number
  warmupCount: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  ciWidth: number
  trueInCI: boolean
  relativeError: number
  bias: number // estimated - true (positive = overestimate)
  posteriorAlpha: number
  posteriorBeta: number
}

interface BetaPriorParams {
  priorAlpha: number
  priorBeta: number
  priorName: string
  passRate: number
  warmupCount: number
}

// =============================================================================
// CUSTOM FILTERED ARBITRARY (for testing different priors)
// =============================================================================

/**
 * Custom FilteredArbitrary implementation that uses a specified prior.
 * This mirrors the real FilteredArbitrary but allows us to inject different priors.
 */
class CustomFilteredArbitrary<A> {
  private sizeEstimation: BetaDistribution
  private baseArbitrary: fc.Arbitrary<A>
  private f: (a: A) => boolean

  constructor(
    baseArbitrary: fc.Arbitrary<A>,
    f: (a: A) => boolean,
    priorAlpha: number,
    priorBeta: number,
    skipWarmup: boolean = false
  ) {
    this.baseArbitrary = baseArbitrary
    this.f = f
    this.sizeEstimation = new BetaDistribution(priorAlpha, priorBeta)

    // Warm-up with deterministic seed (same as FilteredArbitrary)
    // unless skipWarmup is true
    if (!skipWarmup) {
      const WARMUP_SEED = 0xCAFEBABE
      const WARMUP_SAMPLES = 10
      let seed = WARMUP_SEED
      const lcg = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0
        return (seed >>> 0) / 4294967296
      }

      for (let i = 0; i < WARMUP_SAMPLES; i++) {
        this.pick(lcg)
      }
    }
  }

  size(): { value: number; type: 'estimated'; credibleInterval: [number, number] } {
    const baseSize = this.baseArbitrary.size()
    const v = baseSize.value

    // Use 0.05 and 0.95 for 90% credible interval (same as FilteredArbitrary)
    const lowerCredibleInterval = 0.05
    const upperCredibleInterval = 0.95

    const rateLow = this.sizeEstimation.inv(lowerCredibleInterval)
    const rateHigh = this.sizeEstimation.inv(upperCredibleInterval)

    return {
      value: Math.round(v * this.sizeEstimation.mode()),
      type: 'estimated',
      credibleInterval: [
        Math.floor(v * rateLow),
        Math.ceil(v * rateHigh)
      ]
    }
  }

  pick(generator: () => number): { value: A } | undefined {
    // Limit attempts to avoid infinite loops
    const maxAttempts = 1000
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pick = this.baseArbitrary.pick(generator)
      if (pick === undefined) break
      if (this.f(pick.value)) {
        this.sizeEstimation.alpha += 1
        return pick
      }
      this.sizeEstimation.beta += 1
    }
    return undefined
  }

  getPosterior(): { alpha: number; beta: number } {
    return {
      alpha: this.sizeEstimation.alpha,
      beta: this.sizeEstimation.beta
    }
  }
}

// =============================================================================
// TRIAL EXECUTION
// =============================================================================

function runTrial(
  params: BetaPriorParams,
  trialId: number,
  indexInConfig: number
): BetaPriorResult {
  const { priorAlpha, priorBeta, priorName, passRate, warmupCount } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const baseSize = 1000
  // Use deterministic threshold selection for exact true size
  const threshold = Math.floor(baseSize * passRate)
  const actualTrueSize = passRate > 0 && threshold === 0 ? 1 : threshold

  // Create custom FilteredArbitrary with specified prior (skip built-in warmup)
  const arb = new CustomFilteredArbitrary(
    fc.integer(0, baseSize - 1),
    (x: number) => x < actualTrueSize,
    priorAlpha,
    priorBeta,
    true // Skip default warmup, we'll do our own
  )

  // Sample exactly warmupCount times
  for (let i = 0; i < warmupCount; i++) {
    arb.pick(generator)
  }

  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  const ciLower = sizeInfo.credibleInterval[0]
  const ciUpper = sizeInfo.credibleInterval[1]

  const ciWidth = ciUpper - ciLower
  const trueInCI = actualTrueSize >= ciLower && actualTrueSize <= ciUpper
  const relativeError = actualTrueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - actualTrueSize) / actualTrueSize
  const bias = estimatedSize - actualTrueSize

  const posterior = arb.getPosterior()

  return {
    trialId,
    seed,
    priorAlpha,
    priorBeta,
    priorName,
    passRate,
    warmupCount,
    trueSize: actualTrueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    ciWidth,
    trueInCI,
    relativeError,
    bias,
    posteriorAlpha: posterior.alpha,
    posteriorBeta: posterior.beta
  }
}

// =============================================================================
// MAIN STUDY
// =============================================================================

async function runBetaPriorComparisonStudy(): Promise<void> {
  // Create all parameter combinations
  const params: BetaPriorParams[] = []
  for (const prior of PRIORS) {
    for (const passRate of PASS_RATES) {
      for (const warmupCount of WARMUP_COUNTS) {
        params.push({
          priorAlpha: prior.alpha,
          priorBeta: prior.beta,
          priorName: prior.name,
          passRate,
          warmupCount
        })
      }
    }
  }

  const totalConfigs = PRIORS.length * PASS_RATES.length * WARMUP_COUNTS.length
  const totalTrials = totalConfigs * TRIALS_PER_CONFIG

  const runner = new ExperimentRunner<BetaPriorParams, BetaPriorResult>({
    name: 'Beta Prior Comparison Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/beta-prior-comparison.csv'),
    csvHeader: [
      'trial_id', 'seed', 'prior_alpha', 'prior_beta', 'prior_name',
      'pass_rate', 'warmup_count', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci',
      'relative_error', 'bias', 'posterior_alpha', 'posterior_beta'
    ],
    trialsPerConfig: TRIALS_PER_CONFIG,
    resultToRow: (r: BetaPriorResult) => [
      r.trialId, r.seed, r.priorAlpha, r.priorBeta, r.priorName,
      r.passRate, r.warmupCount, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.ciWidth.toFixed(2),
      r.trueInCI, r.relativeError.toFixed(6), r.bias.toFixed(2),
      r.posteriorAlpha.toFixed(2), r.posteriorBeta.toFixed(2)
    ],
    preRunInfo: () => {
      console.log('Study H: Beta Prior Comparison')
      console.log('=' .repeat(60))
      console.log('')
      printPowerAnalysis(powerResult)
      console.log('')
      console.log('Study Design:')
      console.log(`  Priors: ${PRIORS.map(p => p.name.split('_')[0]).join(', ')}`)
      console.log(`  Pass rates: ${PASS_RATES.map(r => `${r * 100}%`).join(', ')}`)
      console.log(`  Warmup counts: ${WARMUP_COUNTS.join(', ')}`)
      console.log(`  Configurations: ${totalConfigs}`)
      console.log(`  Trials per config: ${TRIALS_PER_CONFIG}`)
      console.log(`  Total trials: ${totalTrials.toLocaleString()}`)
      console.log('')
    }
  })

  await runner.run(params, (p, id, idx) => runTrial(p, id, idx))
}

// =============================================================================
// ENTRY POINT
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runBetaPriorComparisonStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runBetaPriorComparisonStudy, POWER_ANALYSIS, TRIALS_PER_CONFIG }
