/**
 * Study B: Early Termination Mathematical Logic Validation
 *
 * CORRECTED STUDY - Addresses mathematical logic error in original interpretation
 *
 * Background:
 * FilteredArbitrary stops trying when: baseSize * sizeEstimation.inv(0.95) < 1
 *
 * Mathematical Interpretation:
 * - sizeEstimation is a BetaDistribution representing the posterior over PASS RATES (values in [0,1])
 * - sizeEstimation.inv(0.95) returns the 95th PERCENTILE of the pass rate distribution
 * - This is the "optimistic" estimate - we're 95% confident the true pass rate is BELOW this value
 * - baseSize * passRate_95th is the optimistic estimate of the filtered size
 * - If even this optimistic estimate is < 1, we stop trying
 *
 * This is a ONE-SIDED conservative decision rule:
 * - We stop only when we're very confident (95%) that the space is empty
 * - False positives (stopping too early) should be rare (~5% by design)
 *
 * Hypotheses:
 * B1: inv(0.95) correctly represents the 95th percentile of the pass rate
 *     - Verify by comparing to analytical Beta distribution properties
 * B2: The stopping criterion is conservative (terminates when true size ≤ 1 in ≥90% of cases)
 *     - Allowing some slack from theoretical 95% due to estimation variance
 * B3: For filters with true size ≥ 10, early termination never triggers
 *     - Decision rule should only stop for genuinely empty/tiny spaces
 * B4: When baseSize is estimated (e.g., tuple of filters), the rule uses point estimate
 *     - Test this scenario explicitly and document behavior
 *
 * Method:
 * 1. Test explicit scenarios showing what inv(0.95) returns after various alpha/beta updates
 * 2. Test filters with known true sizes: 0, 1, 5, 10, 50, 100
 * 3. Test nested filters where baseSize is also estimated
 * 4. Track the actual values at termination decision points
 *
 * ===========================================================================
 * POWER ANALYSIS
 * ===========================================================================
 *
 * This study measures TERMINATION RATES and FALSE TERMINATION RATES.
 * The key metric is the false termination rate, which should be ~5% by design.
 *
 * Challenge: We're measuring RARE EVENTS within a subset of trials.
 * - Not all trials terminate (especially for larger true sizes)
 * - False terminations are rare among those that do terminate
 *
 * We use a two-stage power analysis:
 * 1. For termination rate detection (proportion of trials that terminate)
 * 2. For false termination rate detection (proportion of terminators that are false)
 *
 * Parameters:
 * - Target false termination rate: 5% (by design of 95th percentile threshold)
 * - Minimum detectable deviation: 3% (detect if rate is 2% or 8%)
 * - Significance level (α): 0.05
 * - Statistical power: 95%
 *
 * With these parameters for detecting a 5% rate:
 * - Required sample size: ~1,000 terminators per scenario
 * - Since termination rate varies by scenario, we need different trial counts
 */

import * as fc from '../../src/index.js'
import {BetaDistribution} from '../../src/statistics.js'
import {
  ExperimentRunner,
  getSeed,
  getSampleSize,
  mulberry32,
  calculateRequiredSampleSize,
  printPowerAnalysis,
  ProgressReporter,
  runParallel,
  type PowerAnalysisParams
} from './runner.js'
import path from 'path'

// =============================================================================
// POWER ANALYSIS CONFIGURATION
// =============================================================================

/**
 * Power analysis for false termination rate.
 * We want to detect if the false termination rate deviates from the expected 5%.
 */
const POWER_ANALYSIS: PowerAnalysisParams = {
  /** Expected false termination rate (5% from 95th percentile threshold) */
  targetProportion: 0.05,

  /** Minimum deviation to detect (e.g., detect 2% vs 5% or 8% vs 5%) */
  minDetectableDeviation: 0.03,

  /** Significance level */
  alpha: 0.05,

  /** Statistical power */
  power: 0.95
}

/**
 * Calculate required sample size.
 * Note: This is the number of TERMINATORS needed, not total trials.
 * For scenarios with low termination rates, we need more total trials.
 */
const powerResult = calculateRequiredSampleSize(POWER_ANALYSIS)

/**
 * Estimated termination rates by scenario (from pilot runs).
 * Used to calculate total trials needed to get enough terminators.
 */
const ESTIMATED_TERMINATION_RATES: Record<string, number> = {
  'true_size_0': 1.0,      // Always terminates (empty space)
  'true_size_1': 0.25,     // Sometimes terminates
  'true_size_5': 0.05,     // Rarely terminates
  'true_size_10': 0.01,    // Very rarely terminates
  'true_size_50': 0.001,   // Almost never terminates
  'true_size_100': 0.0001, // Never terminates
  'rare_filter': 0.4,      // Often terminates (0.1% pass rate)
  'nested_true_size_0': 1.0,
  'nested_true_size_10': 0.01,
  'nested_true_size_50': 0.001,
}

/**
 * Calculate trials needed for a scenario to get enough terminators.
 * @param scenario The scenario name
 * @param targetTerminators Desired number of terminating trials
 * @param minTrials Minimum trials regardless of termination rate
 * @param maxTrials Maximum trials to cap computation
 */
function getTrialsForScenario(
  scenario: string,
  targetTerminators: number,
  minTrials: number = 500,
  maxTrials: number = 10000
): number {
  const termRate = ESTIMATED_TERMINATION_RATES[scenario] ?? 0.1
  if (termRate <= 0) return maxTrials
  const needed = Math.ceil(targetTerminators / termRate)
  return Math.min(maxTrials, Math.max(minTrials, needed))
}

/**
 * Base trials per config - used when termination rate is high enough.
 * For scenarios with low termination rates, we use getTrialsForScenario.
 */
const BASE_TRIALS = getSampleSize(
  Math.max(powerResult.requiredSampleSize, 1000),
  100
)

// ============================================================================
// Part 1: Explicit test cases for sizeEstimation.inv(0.95)
// ============================================================================

interface InvTestResult {
  testCase: string
  alpha: number
  beta: number
  inv95: number        // sizeEstimation.inv(0.95) - 95th percentile of pass rate
  mean: number         // Beta mean = alpha / (alpha + beta)
  mode: number         // Beta mode = (alpha - 1) / (alpha + beta - 2)
  inv05: number        // 5th percentile (lower bound)
  ciWidth: number      // inv95 - inv05 (credible interval width)
  expectedPassRate: number  // What we designed the scenario for
}

function runInvTests(): InvTestResult[] {
  const results: InvTestResult[] = []

  // Test cases designed to show what inv(0.95) returns
  const testCases = [
    // Initial prior: optimistic
    {name: 'initial_prior_2_1', alpha: 2, beta: 1, expectedPassRate: 1.0},

    // After 10 failures, 0 successes (pass rate ~0%)
    {name: '0_success_10_fail', alpha: 2, beta: 11, expectedPassRate: 0.0},

    // After 5 successes, 5 failures (pass rate ~50%)
    {name: '5_success_5_fail', alpha: 7, beta: 6, expectedPassRate: 0.5},

    // After 1 success, 99 failures (pass rate ~1%)
    {name: '1_success_99_fail', alpha: 3, beta: 100, expectedPassRate: 0.01},

    // After 10 successes, 90 failures (pass rate ~10%)
    {name: '10_success_90_fail', alpha: 12, beta: 91, expectedPassRate: 0.10},

    // After 50 successes, 50 failures (pass rate ~50%, high confidence)
    {name: '50_success_50_fail', alpha: 52, beta: 51, expectedPassRate: 0.50},

    // After 90 successes, 10 failures (pass rate ~90%)
    {name: '90_success_10_fail', alpha: 92, beta: 11, expectedPassRate: 0.90},

    // After 0 successes, 100 failures (pass rate ~0%)
    {name: '0_success_100_fail', alpha: 2, beta: 101, expectedPassRate: 0.0},

    // Critical edge case: near termination threshold with base size 100
    // If baseSize = 100 and we need baseSize * inv95 < 1, we need inv95 < 0.01
    {name: 'near_threshold_0_200', alpha: 2, beta: 201, expectedPassRate: 0.0},
    {name: 'near_threshold_0_500', alpha: 2, beta: 501, expectedPassRate: 0.0},
    {name: 'near_threshold_0_1000', alpha: 2, beta: 1001, expectedPassRate: 0.0},
  ]

  for (const tc of testCases) {
    const beta = new BetaDistribution(tc.alpha, tc.beta)
    results.push({
      testCase: tc.name,
      alpha: tc.alpha,
      beta: tc.beta,
      inv95: beta.inv(0.95),
      mean: beta.mean(),
      mode: beta.mode(),
      inv05: beta.inv(0.05),
      ciWidth: beta.inv(0.95) - beta.inv(0.05),
      expectedPassRate: tc.expectedPassRate
    })
  }

  return results
}

// ============================================================================
// Part 2: Early termination behavior with known true sizes
// ============================================================================

interface EarlyTerminationResult {
  trialId: number
  seed: number
  scenario: string
  passRate: number
  baseSize: number
  trueSize: number
  samplesTaken: number
  terminated: boolean
  terminationReason: string  // 'ci_upper_below_1' | 'pick_undefined' | 'max_samples'
  estimatedSize: number
  ciLower: number
  ciUpper: number
  inv95AtTermination: number  // The actual inv(0.95) value at decision point
  baseSizeUsed: number        // The baseSize.value used in termination check
  terminationConditionValue: number  // baseSize * inv95 at termination
  falseTermination: boolean   // Terminated but true size >= 1
}

interface EarlyTerminationParams {
  scenario: string
  passRate: number
  baseSize: number
  isNestedFilter: boolean  // Whether baseSize is also estimated
}

export function runEarlyTerminationTrial(
  params: EarlyTerminationParams,
  trialId: number,
  indexInConfig: number
): EarlyTerminationResult {
  const {scenario, passRate, baseSize, isNestedFilter} = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const threshold = Math.floor(baseSize * passRate)
  const trueSize = threshold

  // Create the arbitrary based on whether we're testing nested filters
  let arb: fc.Arbitrary<number | [number, number]>
  let effectiveBaseSize: number

  if (isNestedFilter) {
    // Nested filter: base is itself a filtered arbitrary (tuple of two filtered integers)
    // This tests B4: what happens when baseSize is estimated
    const halfRate = Math.sqrt(passRate)  // So combined rate = halfRate^2 ≈ passRate
    const halfThreshold = Math.floor(Math.sqrt(baseSize) * halfRate)
    arb = fc.tuple(
      fc.integer(0, Math.floor(Math.sqrt(baseSize)) - 1).filter(x => x < halfThreshold),
      fc.integer(0, Math.floor(Math.sqrt(baseSize)) - 1).filter(x => x < halfThreshold)
    ).filter(([a, b]) => a + b < threshold * 2)  // Additional filter to reduce size

    const baseSizeInfo = arb.size()
    effectiveBaseSize = baseSizeInfo.value
  } else {
    // Simple filter: base is exact
    arb = fc.integer(0, baseSize - 1).filter(x => x < threshold)
    effectiveBaseSize = baseSize
  }

  // Reduce maxSamples in quick mode for faster iteration
  const maxSamples = getSampleSize(5000, 500)
  let samplesTaken = 0
  let terminated = false
  let terminationReason = 'max_samples'
  let inv95AtTermination = 1.0
  let baseSizeUsed = effectiveBaseSize
  let terminationConditionValue = effectiveBaseSize

  for (let i = 0; i < maxSamples; i++) {
    // Get size info BEFORE pick to track termination condition
    const sizeInfoBefore = arb.size()
    let ciUpperBefore = effectiveBaseSize
    if (sizeInfoBefore.type === 'estimated') {
      ciUpperBefore = sizeInfoBefore.credibleInterval[1]
    }

    const pick = arb.pick(generator)

    if (pick === undefined) {
      terminated = true
      // Check size info AFTER pick failed to determine termination reason
      const sizeInfoAfter = arb.size()
      if (sizeInfoAfter.type === 'estimated') {
        baseSizeUsed = effectiveBaseSize

        // Note: sizeInfoAfter.credibleInterval[1] uses Math.ceil(), so it will be >= 1
        // even when the actual termination condition was met.
        // The actual termination condition is: baseSize * inv(0.95) < 1
        // We need to back-calculate inv(0.95) from the CI upper bound:
        // CI upper = ceil(baseSize * inv(0.95)), so inv(0.95) ≈ CI_upper / baseSize
        // But since ceil rounds up, we need to check if ceil > 1 OR if ceil == 1 and it was rounded

        // For precise detection: if samplesTaken is 0 and true_size is 0, we know
        // the filter rejected everything and CI-based termination kicked in.
        // More generally: if CI upper bound <= 1, the condition was likely met
        // (since ceil would only give 1 if the raw value was in (0, 1])
        terminationConditionValue = sizeInfoAfter.credibleInterval[1]
        inv95AtTermination = terminationConditionValue / effectiveBaseSize

        // The termination condition: baseSize * inv(0.95) < 1
        // Equivalently: inv(0.95) < 1/baseSize
        // With baseSize=100, this means inv(0.95) < 0.01
        // If CI upper bound is 1 (from ceil), the raw value was in (0,1]
        // which means inv(0.95) was in (0, 1/baseSize]
        // So CI upper == 1 indicates CI-based termination occurred

        if (terminationConditionValue <= 1) {
          terminationReason = 'ci_upper_below_1'
        } else {
          // Otherwise the base arbitrary returned undefined
          terminationReason = 'pick_undefined'
        }
      } else {
        terminationReason = 'pick_undefined'
      }
      break
    }

    samplesTaken++

    // Update tracking after successful pick
    const sizeInfo = arb.size()
    if (sizeInfo.type === 'estimated') {
      baseSizeUsed = effectiveBaseSize
      inv95AtTermination = sizeInfo.credibleInterval[1] / effectiveBaseSize
      terminationConditionValue = sizeInfo.credibleInterval[1]
    }
  }

  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  const ciLower = sizeInfo.type === 'estimated' ? sizeInfo.credibleInterval[0] : sizeInfo.value
  const ciUpper = sizeInfo.type === 'estimated' ? sizeInfo.credibleInterval[1] : sizeInfo.value

  const falseTermination = terminated && terminationReason === 'ci_upper_below_1' && trueSize >= 1

  return {
    trialId,
    seed,
    scenario,
    passRate,
    baseSize,
    trueSize,
    samplesTaken,
    terminated,
    terminationReason,
    estimatedSize,
    ciLower,
    ciUpper,
    inv95AtTermination,
    baseSizeUsed,
    terminationConditionValue,
    falseTermination
  }
}

async function runEarlyTerminationStudy(): Promise<void> {
  // ========================================================================
  // Print power analysis
  // ========================================================================
  console.log('\n=== Study B: Early Termination Mathematical Logic Validation ===\n')
  console.log('=' .repeat(60))
  printPowerAnalysis(powerResult)
  console.log('')
  console.log('Note: Sample size is for TERMINATORS. Total trials vary by scenario')
  console.log('      based on expected termination rates.')
  console.log('')

  // ========================================================================
  // Part 1: Run inv() test cases and output separately
  // ========================================================================
  console.log('=== Part 1: Beta Distribution inv(0.95) Test Cases ===\n')
  const invResults = runInvTests()

  console.log('What does sizeEstimation.inv(0.95) return?')
  console.log('Note: inv(0.95) is the 95th percentile of the pass rate distribution')
  console.log('      i.e., we are 95% confident the true pass rate is BELOW this value\n')

  console.log('Test Case                    | Alpha | Beta  | inv(0.95) | Mean    | Mode    | CI Width')
  console.log('-'.repeat(100))
  for (const r of invResults) {
    console.log(
      `${r.testCase.padEnd(28)} | ${r.alpha.toString().padStart(5)} | ${r.beta.toString().padStart(5)} | ` +
      `${r.inv95.toFixed(4).padStart(9)} | ${r.mean.toFixed(4).padStart(7)} | ` +
      `${(r.mode >= 0 ? r.mode.toFixed(4) : 'N/A').padStart(7)} | ${r.ciWidth.toFixed(4)}`
    )
  }

  console.log('\nKey Observations:')
  console.log('1. inv(0.95) is always >= mean (it\'s the upper credible bound)')
  console.log('2. As failures accumulate, inv(0.95) decreases')
  console.log('3. For termination with baseSize=100, need inv(0.95) < 0.01')
  console.log('   This requires ~200+ failures with 0 successes (see near_threshold tests)\n')

  // Write inv test results to CSV
  const invCsvPath = path.join(process.cwd(), 'docs/evidence/raw/early-termination-inv-tests.csv')
  const fs = await import('fs')
  const invHeader = 'test_case,alpha,beta,inv95,mean,mode,inv05,ci_width,expected_pass_rate'
  const invRows = invResults.map(r =>
    `${r.testCase},${r.alpha},${r.beta},${r.inv95.toFixed(6)},${r.mean.toFixed(6)},` +
    `${r.mode.toFixed(6)},${r.inv05.toFixed(6)},${r.ciWidth.toFixed(6)},${r.expectedPassRate}`
  )
  fs.writeFileSync(invCsvPath, [invHeader, ...invRows].join('\n'))
  console.log(`Written inv test results to: ${invCsvPath}\n`)

  // ========================================================================
  // Part 2: Run early termination trials with power-analysis-driven sample sizes
  // ========================================================================
  console.log('=== Part 2: Early Termination Trials ===\n')

  // Define scenarios with their expected termination rates
  const scenarioConfigs = [
    // Simple filters with exact baseSize
    {scenario: 'true_size_0', passRate: 0, baseSize: 100, isNestedFilter: false},
    {scenario: 'true_size_1', passRate: 0.01, baseSize: 100, isNestedFilter: false},
    {scenario: 'true_size_5', passRate: 0.05, baseSize: 100, isNestedFilter: false},
    {scenario: 'true_size_10', passRate: 0.10, baseSize: 100, isNestedFilter: false},
    {scenario: 'true_size_50', passRate: 0.50, baseSize: 100, isNestedFilter: false},
    {scenario: 'true_size_100', passRate: 1.00, baseSize: 100, isNestedFilter: false},

    // Very rare filter (0.1% pass rate with larger base)
    {scenario: 'rare_filter', passRate: 0.001, baseSize: 1000, isNestedFilter: false},

    // Nested filters where baseSize is also estimated (B4)
    {scenario: 'nested_true_size_0', passRate: 0, baseSize: 100, isNestedFilter: true},
    {scenario: 'nested_true_size_10', passRate: 0.10, baseSize: 100, isNestedFilter: true},
    {scenario: 'nested_true_size_50', passRate: 0.50, baseSize: 100, isNestedFilter: true},
  ]

  // Calculate trials needed per scenario
  const targetTerminators = powerResult.requiredSampleSize
  console.log('Scenario Trial Counts (based on power analysis):')
  console.log(`  Target terminators per scenario: ${targetTerminators}`)
  console.log('')

  // Calculate total trials first for progress reporting
  const scenarioTrialCounts: {config: typeof scenarioConfigs[0], trials: number}[] = []
  let totalTrials = 0

  for (const config of scenarioConfigs) {
    const trialsForScenario = getTrialsForScenario(
      config.scenario,
      targetTerminators,
      getSampleSize(500, 50),   // min trials
      getSampleSize(5000, 200)  // max trials
    )
    scenarioTrialCounts.push({config, trials: trialsForScenario})
    totalTrials += trialsForScenario

    const estTermRate = ESTIMATED_TERMINATION_RATES[config.scenario] ?? 0.1
    const expectedTerminators = Math.round(trialsForScenario * estTermRate)
    console.log(`  ${config.scenario}: ${trialsForScenario} trials (expect ~${expectedTerminators} terminators)`)
  }

  console.log(`\nTotal trials: ${totalTrials}`)
  console.log('')

  // Run each scenario with progress reporting
  const allResults: EarlyTerminationResult[] = []
  let globalTrialId = 0

  const progress = new ProgressReporter(totalTrials, 'Early Termination')
  const threads = process.env.THREADS ? parseInt(process.env.THREADS, 10) : 1

  if (threads > 1) {
    const tasks = []
    for (const {config, trials: trialsForScenario} of scenarioTrialCounts) {
      for (let i = 0; i < trialsForScenario; i++) {
        tasks.push({
          args: [config, globalTrialId, i],
          taskId: globalTrialId
        })
        globalTrialId++
      }
    }
    
    const results = await runParallel<EarlyTerminationResult>(
      tasks,
      import.meta.url,
      'runEarlyTerminationTrial',
      progress
    )
    allResults.push(...results)
  } else {
    for (const {config, trials: trialsForScenario} of scenarioTrialCounts) {
      for (let i = 0; i < trialsForScenario; i++) {
        const result = runEarlyTerminationTrial(config, globalTrialId, i)
        allResults.push(result)
        globalTrialId++
        progress.update()
      }
    }
  }
  progress.finish()

  console.log('\n')

  // Write results to CSV
  const csvPath = path.join(process.cwd(), 'docs/evidence/raw/early-termination.csv')
  const header = [
    'trial_id', 'seed', 'scenario', 'pass_rate', 'base_size', 'true_size',
    'samples_taken', 'terminated', 'termination_reason', 'estimated_size',
    'ci_lower', 'ci_upper', 'inv95_at_termination', 'base_size_used',
    'termination_condition_value', 'false_termination'
  ].join(',')

  const rows = allResults.map(r => [
    r.trialId, r.seed, r.scenario, r.passRate, r.baseSize, r.trueSize,
    r.samplesTaken, r.terminated, r.terminationReason, r.estimatedSize,
    (r.ciLower ?? 0).toFixed(4), (r.ciUpper ?? 0).toFixed(4), (r.inv95AtTermination ?? 0).toFixed(6),
    r.baseSizeUsed, (r.terminationConditionValue ?? 0).toFixed(4), r.falseTermination
  ].join(','))

  fs.writeFileSync(csvPath, [header, ...rows].join('\n'))
  console.log(`\n✓ Early Termination Study complete`)
  console.log(`  Output: ${csvPath}`)

  // Print summary statistics
  console.log('\n=== Summary Statistics ===\n')
  const byScenario = new Map<string, EarlyTerminationResult[]>()
  for (const r of allResults) {
    if (!byScenario.has(r.scenario)) byScenario.set(r.scenario, [])
    byScenario.get(r.scenario)!.push(r)
  }

  console.log('Scenario             | Trials | Terminated | CI-Term | False-Term | Term Rate | False Rate')
  console.log('-'.repeat(95))
  for (const [scenario, results] of byScenario) {
    const total = results.length
    const terminated = results.filter(r => r.terminated).length
    const ciTerm = results.filter(r => r.terminationReason === 'ci_upper_below_1').length
    const falseTerm = results.filter(r => r.falseTermination).length
    const termRate = terminated / total
    const falseRate = ciTerm > 0 ? falseTerm / ciTerm : 0

    console.log(
      `${scenario.padEnd(20)} | ${total.toString().padStart(6)} | ${terminated.toString().padStart(10)} | ` +
      `${ciTerm.toString().padStart(7)} | ${falseTerm.toString().padStart(10)} | ` +
      `${(termRate * 100).toFixed(1).padStart(8)}% | ${(falseRate * 100).toFixed(1).padStart(9)}%`
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEarlyTerminationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export {runEarlyTerminationStudy, POWER_ANALYSIS, powerResult, ESTIMATED_TERMINATION_RATES}
