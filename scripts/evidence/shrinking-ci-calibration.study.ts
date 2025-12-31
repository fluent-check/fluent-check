/**
 * Study E: Shrinking CI Calibration
 *
 * Does calibration hold for shrunk filtered arbitraries?
 *
 * PROBLEM ANALYSIS:
 * When shrinking, FilteredArbitrary.shrink() returns a NEW FilteredArbitrary:
 *   return shrunkBase.filter(v => this.f(v))
 *
 * This creates a fresh instance with:
 * - New BetaDistribution(2, 1) prior (cold start)
 * - Only 10 warmup samples (constructor default)
 * - No transfer of information from parent's posterior
 *
 * HYPOTHESES:
 * E1: Coverage ≥90% when shrunk space has same pass rate as parent
 *     Rationale: If pass rate is preserved, warmup should calibrate similarly
 *
 * E2: Coverage ≥85% when shrunk space has higher pass rate (subset shrinking)
 *     Rationale: Higher pass rate should be easier to estimate
 *
 * E3: CI width increases after shrinking due to cold start
 *     Rationale: Fresh prior means wider intervals until re-warmed
 *
 * E4: Coverage improves with additional warmup samples post-shrink
 *     Rationale: More samples -> better posterior -> better calibration
 *
 * METHOD:
 * 1. Create parent FilteredArbitrary, sample to build posterior
 * 2. Call actual shrink() method with a value in the filtered space
 * 3. Measure CI calibration immediately after shrink (cold start)
 * 4. Measure after additional warmup samples
 *
 * SCENARIOS (with known structure and computable ground truth):
 *
 * Scenario 1: Same Pass Rate (Modulo Filter)
 *   Parent: fc.integer(0, 999).filter(x => x % 2 === 0)  [pass rate 50%]
 *   Shrink value: 250
 *   Shrunk: fc.integer(0, 250).filter(x => x % 2 === 0)  [pass rate ~50%]
 *   True shrunk size: 126 (0, 2, 4, ..., 250)
 *
 * Scenario 2: Higher Pass Rate (Threshold Filter)
 *   Parent: fc.integer(0, 999).filter(x => x < 500)  [pass rate 50%]
 *   Shrink value: 200
 *   Shrunk: fc.integer(0, 200).filter(x => x < 500)  [pass rate 100%]
 *   True shrunk size: 201 (all values pass since 200 < 500)
 *
 * Scenario 3: Sparse Filter (Modulo 10)
 *   Parent: fc.integer(0, 999).filter(x => x % 10 === 0)  [pass rate 10%]
 *   Shrink value: 50
 *   Shrunk: fc.integer(0, 50).filter(x => x % 10 === 0)  [pass rate ~12%]
 *   True shrunk size: 6 (0, 10, 20, 30, 40, 50)
 */

import * as fc from '../../src/index.js'
import {ExperimentRunner, getSeed, getSampleSize, mulberry32} from './runner.js'
import path from 'path'

// ============================================================================
// Types
// ============================================================================

interface ShrinkingCIResult {
  trialId: number
  seed: number
  scenario: string
  // Parent information
  parentBaseMax: number
  parentTrueSize: number
  parentPassRate: number
  parentEstSize: number
  parentCiLower: number
  parentCiUpper: number
  parentTrueInCi: boolean
  parentCiWidth: number
  // Shrunk information
  shrinkValue: number
  shrunkTrueSize: number
  shrunkPassRate: number
  // Measurements at different warmup points
  warmup0EstSize: number
  warmup0CiLower: number
  warmup0CiUpper: number
  warmup0TrueInCi: boolean
  warmup0CiWidth: number
  warmup10EstSize: number
  warmup10CiLower: number
  warmup10CiUpper: number
  warmup10TrueInCi: boolean
  warmup10CiWidth: number
  warmup50EstSize: number
  warmup50CiLower: number
  warmup50CiUpper: number
  warmup50TrueInCi: boolean
  warmup50CiWidth: number
  warmup100EstSize: number
  warmup100CiLower: number
  warmup100CiUpper: number
  warmup100TrueInCi: boolean
  warmup100CiWidth: number
}

interface ScenarioConfig {
  name: string
  description: string
  parentBaseMax: number
  filter: (x: number) => boolean
  parentTrueSize: number
  parentPassRate: number
  shrinkValue: number
  shrunkTrueSize: number
  shrunkPassRate: number
}

// ============================================================================
// Scenarios with computable ground truth
// ============================================================================

// IMPORTANT: ArbitraryInteger.shrink(value) returns integers in [0, value-1] NOT [0, value]
// So shrunkBaseSize = shrinkValue (not shrinkValue + 1)

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'same_pass_rate_mod2',
    description: 'Even numbers: pass rate preserved (~50%) after shrinking',
    parentBaseMax: 999,
    filter: (x: number) => x % 2 === 0,
    parentTrueSize: 500, // 0, 2, 4, ..., 998
    parentPassRate: 0.50,
    shrinkValue: 250,
    // Shrunk base: [0, 249] (250 values), filter passes evens: 0,2,4,...,248 = 125 values
    shrunkTrueSize: 125,
    shrunkPassRate: 125 / 250 // 50%
  },
  {
    name: 'higher_pass_rate_threshold',
    description: 'Threshold filter: 100% pass rate after shrinking below threshold',
    parentBaseMax: 999,
    filter: (x: number) => x < 500,
    parentTrueSize: 500, // 0, 1, ..., 499
    parentPassRate: 0.50,
    shrinkValue: 200,
    // Shrunk base: [0, 199] (200 values), all pass since 199 < 500
    shrunkTrueSize: 200,
    shrunkPassRate: 1.0
  },
  {
    name: 'sparse_mod10',
    description: 'Multiples of 10: sparse filter with small shrunk space',
    parentBaseMax: 999,
    filter: (x: number) => x % 10 === 0,
    parentTrueSize: 100, // 0, 10, ..., 990
    parentPassRate: 0.10,
    shrinkValue: 50,
    // Shrunk base: [0, 49] (50 values), filter passes: 0, 10, 20, 30, 40 = 5 values
    shrunkTrueSize: 5,
    shrunkPassRate: 5 / 50 // 10%
  },
  {
    name: 'clustered_low',
    description: 'Clustered in low range: shrinking includes full cluster',
    parentBaseMax: 999,
    filter: (x: number) => x < 100,
    parentTrueSize: 100, // 0-99
    parentPassRate: 0.10,
    shrinkValue: 50,
    // Shrunk base: [0, 49] (50 values), all pass since 49 < 100
    shrunkTrueSize: 50,
    shrunkPassRate: 1.0
  },
  {
    name: 'mixed_ranges',
    description: 'Two ranges: x<100 OR 500<=x<600, shrinking from first range',
    parentBaseMax: 999,
    filter: (x: number) => x < 100 || (x >= 500 && x < 600),
    parentTrueSize: 200, // 0-99 + 500-599
    parentPassRate: 0.20,
    shrinkValue: 50,  // Must pass filter: 50 < 100 ✓
    // Shrunk base: [0, 49] (50 values), filter passes: 0-49 = 50 values (all)
    shrunkTrueSize: 50,
    shrunkPassRate: 1.0
  },
  {
    name: 'very_sparse_mod100',
    description: 'Very sparse: multiples of 100, tiny shrunk space',
    parentBaseMax: 999,
    filter: (x: number) => x % 100 === 0,
    parentTrueSize: 10, // 0, 100, ..., 900
    parentPassRate: 0.01,
    shrinkValue: 200, // Must pass filter: 200 % 100 === 0 ✓
    // Shrunk base: [0, 199] (200 values), filter passes: 0, 100 = 2 values
    shrunkTrueSize: 2,
    shrunkPassRate: 2 / 200 // 1%
  }
]

// ============================================================================
// Trial Runner
// ============================================================================

function runTrial(
  scenario: ScenarioConfig,
  trialId: number,
  indexInConfig: number
): ShrinkingCIResult {
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  // Create parent filtered arbitrary
  const parent = fc.integer(0, scenario.parentBaseMax).filter(scenario.filter)

  // Sample from parent to build posterior (constructor already does 10 warmup)
  // Add more samples to get well-calibrated parent estimate
  for (let i = 0; i < 100; i++) {
    parent.pick(generator)
  }

  // Measure parent CI
  const parentSize = parent.size()
  const parentEstSize = parentSize.value
  const parentCiLower = parentSize.type === 'estimated' ? parentSize.credibleInterval[0] : parentSize.value
  const parentCiUpper = parentSize.type === 'estimated' ? parentSize.credibleInterval[1] : parentSize.value
  const parentTrueInCi = scenario.parentTrueSize >= parentCiLower && scenario.parentTrueSize <= parentCiUpper
  const parentCiWidth = parentCiUpper - parentCiLower

  // Create pick for shrinking (must satisfy the filter)
  const shrinkPick = {value: scenario.shrinkValue, original: scenario.shrinkValue}

  // Call actual shrink() method - this creates NEW FilteredArbitrary with cold start
  const shrunk = parent.shrink(shrinkPick)

  // Measure immediately after shrink (warmup 0 - only constructor's 10 samples)
  // Note: Constructor already does 10 warmup samples, so "warmup 0" means default behavior
  const w0Size = shrunk.size()
  const warmup0EstSize = w0Size.value
  const warmup0CiLower = w0Size.type === 'estimated' ? w0Size.credibleInterval[0] : w0Size.value
  const warmup0CiUpper = w0Size.type === 'estimated' ? w0Size.credibleInterval[1] : w0Size.value
  const warmup0TrueInCi = scenario.shrunkTrueSize >= warmup0CiLower && scenario.shrunkTrueSize <= warmup0CiUpper
  const warmup0CiWidth = warmup0CiUpper - warmup0CiLower

  // Add 10 more samples (total ~20)
  for (let i = 0; i < 10; i++) {
    shrunk.pick(generator)
  }
  const w10Size = shrunk.size()
  const warmup10EstSize = w10Size.value
  const warmup10CiLower = w10Size.type === 'estimated' ? w10Size.credibleInterval[0] : w10Size.value
  const warmup10CiUpper = w10Size.type === 'estimated' ? w10Size.credibleInterval[1] : w10Size.value
  const warmup10TrueInCi = scenario.shrunkTrueSize >= warmup10CiLower && scenario.shrunkTrueSize <= warmup10CiUpper
  const warmup10CiWidth = warmup10CiUpper - warmup10CiLower

  // Add 40 more samples (total ~60)
  for (let i = 0; i < 40; i++) {
    shrunk.pick(generator)
  }
  const w50Size = shrunk.size()
  const warmup50EstSize = w50Size.value
  const warmup50CiLower = w50Size.type === 'estimated' ? w50Size.credibleInterval[0] : w50Size.value
  const warmup50CiUpper = w50Size.type === 'estimated' ? w50Size.credibleInterval[1] : w50Size.value
  const warmup50TrueInCi = scenario.shrunkTrueSize >= warmup50CiLower && scenario.shrunkTrueSize <= warmup50CiUpper
  const warmup50CiWidth = warmup50CiUpper - warmup50CiLower

  // Add 50 more samples (total ~110)
  for (let i = 0; i < 50; i++) {
    shrunk.pick(generator)
  }
  const w100Size = shrunk.size()
  const warmup100EstSize = w100Size.value
  const warmup100CiLower = w100Size.type === 'estimated' ? w100Size.credibleInterval[0] : w100Size.value
  const warmup100CiUpper = w100Size.type === 'estimated' ? w100Size.credibleInterval[1] : w100Size.value
  const warmup100TrueInCi = scenario.shrunkTrueSize >= warmup100CiLower && scenario.shrunkTrueSize <= warmup100CiUpper
  const warmup100CiWidth = warmup100CiUpper - warmup100CiLower

  return {
    trialId,
    seed,
    scenario: scenario.name,
    parentBaseMax: scenario.parentBaseMax,
    parentTrueSize: scenario.parentTrueSize,
    parentPassRate: scenario.parentPassRate,
    parentEstSize,
    parentCiLower,
    parentCiUpper,
    parentTrueInCi,
    parentCiWidth,
    shrinkValue: scenario.shrinkValue,
    shrunkTrueSize: scenario.shrunkTrueSize,
    shrunkPassRate: scenario.shrunkPassRate,
    warmup0EstSize,
    warmup0CiLower,
    warmup0CiUpper,
    warmup0TrueInCi,
    warmup0CiWidth,
    warmup10EstSize,
    warmup10CiLower,
    warmup10CiUpper,
    warmup10TrueInCi,
    warmup10CiWidth,
    warmup50EstSize,
    warmup50CiLower,
    warmup50CiUpper,
    warmup50TrueInCi,
    warmup50CiWidth,
    warmup100EstSize,
    warmup100CiLower,
    warmup100CiUpper,
    warmup100TrueInCi,
    warmup100CiWidth
  }
}

// ============================================================================
// Main
// ============================================================================

async function runShrinkingCIStudy(): Promise<void> {
  console.log('\n=== Study E: Shrinking CI Calibration ===\n')

  console.log('Problem: FilteredArbitrary.shrink() creates a new instance with:')
  console.log('  - Fresh Beta(2,1) prior (cold start)')
  console.log('  - Only 10 warmup samples (constructor default)')
  console.log('  - No transfer of parent posterior\n')

  console.log('Hypotheses:')
  console.log('  E1: Coverage >=90% when shrunk space has same pass rate')
  console.log('  E2: Coverage >=85% when shrunk space has higher pass rate')
  console.log('  E3: CI width increases after shrinking (cold start effect)')
  console.log('  E4: Coverage improves with additional warmup\n')

  console.log('Scenarios:')
  for (const s of SCENARIOS) {
    console.log(`  ${s.name}:`)
    console.log(`    ${s.description}`)
    console.log(`    Parent: size=${s.parentTrueSize}, passRate=${(s.parentPassRate * 100).toFixed(1)}%`)
    console.log(`    Shrunk: size=${s.shrunkTrueSize}, passRate=${(s.shrunkPassRate * 100).toFixed(1)}%`)
  }
  console.log()

  const runner = new ExperimentRunner<ScenarioConfig, ShrinkingCIResult>({
    name: 'Shrinking CI Calibration Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/shrinking-ci-calibration.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario',
      'parent_base_max', 'parent_true_size', 'parent_pass_rate',
      'parent_est_size', 'parent_ci_lower', 'parent_ci_upper', 'parent_true_in_ci', 'parent_ci_width',
      'shrink_value', 'shrunk_true_size', 'shrunk_pass_rate',
      'warmup0_est_size', 'warmup0_ci_lower', 'warmup0_ci_upper', 'warmup0_true_in_ci', 'warmup0_ci_width',
      'warmup10_est_size', 'warmup10_ci_lower', 'warmup10_ci_upper', 'warmup10_true_in_ci', 'warmup10_ci_width',
      'warmup50_est_size', 'warmup50_ci_lower', 'warmup50_ci_upper', 'warmup50_true_in_ci', 'warmup50_ci_width',
      'warmup100_est_size', 'warmup100_ci_lower', 'warmup100_ci_upper', 'warmup100_true_in_ci', 'warmup100_ci_width'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: ShrinkingCIResult) => [
      r.trialId, r.seed, r.scenario,
      r.parentBaseMax, r.parentTrueSize, r.parentPassRate.toFixed(4),
      r.parentEstSize, r.parentCiLower.toFixed(2), r.parentCiUpper.toFixed(2), r.parentTrueInCi, r.parentCiWidth.toFixed(2),
      r.shrinkValue, r.shrunkTrueSize, r.shrunkPassRate.toFixed(4),
      r.warmup0EstSize, r.warmup0CiLower.toFixed(2), r.warmup0CiUpper.toFixed(2), r.warmup0TrueInCi, r.warmup0CiWidth.toFixed(2),
      r.warmup10EstSize, r.warmup10CiLower.toFixed(2), r.warmup10CiUpper.toFixed(2), r.warmup10TrueInCi, r.warmup10CiWidth.toFixed(2),
      r.warmup50EstSize, r.warmup50CiLower.toFixed(2), r.warmup50CiUpper.toFixed(2), r.warmup50TrueInCi, r.warmup50CiWidth.toFixed(2),
      r.warmup100EstSize, r.warmup100CiLower.toFixed(2), r.warmup100CiUpper.toFixed(2), r.warmup100TrueInCi, r.warmup100CiWidth.toFixed(2)
    ]
  })

  await runner.run(SCENARIOS, (params, id, idx) => runTrial(params, id, idx))

  console.log('\nAnalyze results with:')
  console.log('  cd analysis && source .venv/bin/activate && python3 shrinking_ci_calibration.py')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runShrinkingCIStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export {runShrinkingCIStudy}
