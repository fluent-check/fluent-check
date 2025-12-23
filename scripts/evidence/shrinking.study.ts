/**
 * Shrinking Evaluation Study: Does FluentCheck effectively minimize witnesses?
 *
 * Tests witness shrinking quality across different scenarios:
 * - Predicates with clear minimal witnesses (x > threshold)
 * - Predicates with multiple satisfying ranges
 * - Modular arithmetic predicates (x % k === 0)
 *
 * Hypothesis: FluentCheck's shrinking consistently finds minimal or near-minimal
 * witnesses, with measurable improvements from initial random finds.
 *
 * Key differentiator: Manual loops cannot shrink witnesses - they just find any
 * satisfying value and stop. FluentCheck actively minimizes.
 */

import * as fc from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

// Large range for meaningful shrinking potential
const LARGE_RANGE_MIN = 1
const LARGE_RANGE_MAX = 1_000_000

interface ShrinkingResult {
  trialId: number
  seed: number
  scenario: string
  witnessFound: boolean
  initialWitness: number | null
  finalWitness: number | null
  expectedMinimal: number
  isMinimal: boolean
  shrinkCandidatesTested: number
  shrinkRoundsCompleted: number
  shrinkImprovementsMade: number
  explorationTimeMs: number
  shrinkingTimeMs: number
  totalElapsedMicros: number
}

/**
 * Scenario 1: Threshold predicate (x > 100)
 * Minimal witness: 101
 *
 * This predicate has a dense solution space (99.99% of range satisfies),
 * but there's a clear minimal witness. Good test of shrinking.
 */
function runThresholdTrial(trialId: number, sampleSize: number): ShrinkingResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()
  const expectedMinimal = 101

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withShrinking()  // Enable shrinking
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x > 100)
    .check()

  const totalElapsedMicros = timer.elapsedMicros()

  const witness = result.satisfiable ? (result.example as { x: number }).x : null
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: 'threshold_gt_100',
    witnessFound: result.satisfiable,
    // Note: We can't directly capture the pre-shrink value from the API,
    // but we can infer shrinking quality from the final result and statistics
    initialWitness: null, // Would need API changes to capture
    finalWitness: witness,
    expectedMinimal,
    isMinimal: witness === expectedMinimal,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkRoundsCompleted: shrinkingStats?.roundsCompleted ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0,
    explorationTimeMs: result.statistics.executionTimeBreakdown?.exploration ?? 0,
    shrinkingTimeMs: result.statistics.executionTimeBreakdown?.shrinking ?? 0,
    totalElapsedMicros
  }
}

/**
 * Scenario 2: Modular predicate (x % 10000 === 0)
 * Minimal witness: 10000
 *
 * Sparse solution space (0.01%) with clear minimal. Tests shrinking
 * when witnesses are rare and improvements matter more.
 */
function runModularTrial(trialId: number, sampleSize: number): ShrinkingResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()
  const expectedMinimal = 10000

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withShrinking()  // Enable shrinking
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x % 10000 === 0)
    .check()

  const totalElapsedMicros = timer.elapsedMicros()

  const witness = result.satisfiable ? (result.example as { x: number }).x : null
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: 'modular_10000',
    witnessFound: result.satisfiable,
    initialWitness: null,
    finalWitness: witness,
    expectedMinimal,
    isMinimal: witness === expectedMinimal,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkRoundsCompleted: shrinkingStats?.roundsCompleted ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0,
    explorationTimeMs: result.statistics.executionTimeBreakdown?.exploration ?? 0,
    shrinkingTimeMs: result.statistics.executionTimeBreakdown?.shrinking ?? 0,
    totalElapsedMicros
  }
}

/**
 * Scenario 3: Square root predicate (x * x > 50000)
 * Minimal witness: 224 (since 223² = 49729, 224² = 50176)
 *
 * Non-linear predicate where the minimal witness isn't obvious
 * from the predicate structure.
 */
function runSquareRootTrial(trialId: number, sampleSize: number): ShrinkingResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()
  const expectedMinimal = 224 // ceil(sqrt(50000)) = ceil(223.6) = 224

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withShrinking()  // Enable shrinking
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x * x > 50000)
    .check()

  const totalElapsedMicros = timer.elapsedMicros()

  const witness = result.satisfiable ? (result.example as { x: number }).x : null
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: 'square_gt_50000',
    witnessFound: result.satisfiable,
    initialWitness: null,
    finalWitness: witness,
    expectedMinimal,
    isMinimal: witness === expectedMinimal,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkRoundsCompleted: shrinkingStats?.roundsCompleted ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0,
    explorationTimeMs: result.statistics.executionTimeBreakdown?.exploration ?? 0,
    shrinkingTimeMs: result.statistics.executionTimeBreakdown?.shrinking ?? 0,
    totalElapsedMicros
  }
}

/**
 * Scenario 4: Range predicate (1000 <= x <= 10000)
 * Minimal witness: 1000
 *
 * Tests shrinking when there's a clear bounded range.
 */
function runRangeTrial(trialId: number, sampleSize: number): ShrinkingResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()
  const expectedMinimal = 1000

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withShrinking()  // Enable shrinking
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x >= 1000 && x <= 10000)
    .check()

  const totalElapsedMicros = timer.elapsedMicros()

  const witness = result.satisfiable ? (result.example as { x: number }).x : null
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: 'range_1000_10000',
    witnessFound: result.satisfiable,
    initialWitness: null,
    finalWitness: witness,
    expectedMinimal,
    isMinimal: witness === expectedMinimal,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkRoundsCompleted: shrinkingStats?.roundsCompleted ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0,
    explorationTimeMs: result.statistics.executionTimeBreakdown?.exploration ?? 0,
    shrinkingTimeMs: result.statistics.executionTimeBreakdown?.shrinking ?? 0,
    totalElapsedMicros
  }
}

/**
 * Scenario 5: Composite predicate (x > 100 AND x % 7 === 0)
 * Minimal witness: 105 (first multiple of 7 greater than 100)
 *
 * Tests shrinking with compound conditions.
 */
function runCompositeTrial(trialId: number, sampleSize: number): ShrinkingResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()
  const expectedMinimal = 105 // 15 * 7 = 105

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withShrinking()  // Enable shrinking
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x > 100 && x % 7 === 0)
    .check()

  const totalElapsedMicros = timer.elapsedMicros()

  const witness = result.satisfiable ? (result.example as { x: number }).x : null
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: 'composite_gt100_mod7',
    witnessFound: result.satisfiable,
    initialWitness: null,
    finalWitness: witness,
    expectedMinimal,
    isMinimal: witness === expectedMinimal,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkRoundsCompleted: shrinkingStats?.roundsCompleted ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0,
    explorationTimeMs: result.statistics.executionTimeBreakdown?.exploration ?? 0,
    shrinkingTimeMs: result.statistics.executionTimeBreakdown?.shrinking ?? 0,
    totalElapsedMicros
  }
}

/**
 * Run shrinking evaluation study
 */
async function runShrinkingStudy(): Promise<void> {
  console.log('\n=== Shrinking Evaluation Study ===')
  console.log('Hypothesis: FluentCheck effectively minimizes witnesses to near-minimal values')
  console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}]\n`)

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/shrinking.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'scenario',
    'witness_found',
    'initial_witness',
    'final_witness',
    'expected_minimal',
    'is_minimal',
    'shrink_candidates_tested',
    'shrink_rounds_completed',
    'shrink_improvements_made',
    'exploration_time_ms',
    'shrinking_time_ms',
    'total_elapsed_micros'
  ])

  // Increased sample sizes for more reliable results, especially for sparse scenarios
  // Statistical target: CI width < 4% for most scenarios, at least 30-50 minimal witnesses for rare events
  const trialsPerScenario = getSampleSize(2000, 300) // 2000 trials in full mode for reliable statistics (was 1000)
  const sampleSize = 2000 // Higher sample size to ensure witness finding for sparse predicates (was 500)

  const scenarios = [
    { name: 'threshold_gt_100', runner: runThresholdTrial, description: 'x > 100 (minimal: 101)' },
    { name: 'modular_10000', runner: runModularTrial, description: 'x % 10000 === 0 (minimal: 10000)' },
    { name: 'square_gt_50000', runner: runSquareRootTrial, description: 'x² > 50000 (minimal: 224)' },
    { name: 'range_1000_10000', runner: runRangeTrial, description: '1000 ≤ x ≤ 10000 (minimal: 1000)' },
    { name: 'composite_gt100_mod7', runner: runCompositeTrial, description: 'x > 100 ∧ x % 7 === 0 (minimal: 105)' }
  ]

  const totalTrials = scenarios.length * trialsPerScenario

  console.log('Scenarios:')
  for (const s of scenarios) {
    console.log(`  - ${s.name}: ${s.description}`)
  }
  console.log(`\nSample size: ${sampleSize}`)
  console.log(`Trials per scenario: ${trialsPerScenario}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'Shrinking')

  let trialId = 0
  for (const scenario of scenarios) {
    for (let i = 0; i < trialsPerScenario; i++) {
      const result = scenario.runner(trialId, sampleSize)

      writer.writeRow([
        result.trialId,
        result.seed,
        result.scenario,
        result.witnessFound,
        result.initialWitness ?? '',
        result.finalWitness ?? '',
        result.expectedMinimal,
        result.isMinimal,
        result.shrinkCandidatesTested,
        result.shrinkRoundsCompleted,
        result.shrinkImprovementsMade,
        result.explorationTimeMs,
        result.shrinkingTimeMs,
        result.totalElapsedMicros
      ])

      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Shrinking evaluation study complete`)
  console.log(`  Output: ${outputPath}`)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runShrinkingStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runShrinkingStudy }
