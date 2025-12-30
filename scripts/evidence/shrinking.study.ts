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
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
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

interface ShrinkingParams {
  name: string
  description: string
  runner: (trialId: number, sampleSize: number, indexInConfig: number) => ShrinkingResult
  sampleSize: number
}

/**
 * Scenario 1: Threshold predicate (x > 100)
 * Minimal witness: 101
 */
function runThresholdTrial(trialId: number, sampleSize: number, indexInConfig: number): ShrinkingResult {
  const seed = getSeed(indexInConfig)
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
 * Scenario 2: Modular predicate (x % 10000 === 0)
 * Minimal witness: 10000
 */
function runModularTrial(trialId: number, sampleSize: number, indexInConfig: number): ShrinkingResult {
  const seed = getSeed(indexInConfig)
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
 */
function runSquareRootTrial(trialId: number, sampleSize: number, indexInConfig: number): ShrinkingResult {
  const seed = getSeed(indexInConfig)
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
 */
function runRangeTrial(trialId: number, sampleSize: number, indexInConfig: number): ShrinkingResult {
  const seed = getSeed(indexInConfig)
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
 */
function runCompositeTrial(trialId: number, sampleSize: number, indexInConfig: number): ShrinkingResult {
  const seed = getSeed(indexInConfig)
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
 * Dispatcher for running trials
 */
function runTrial(
  params: ShrinkingParams,
  trialId: number,
  indexInConfig: number
): ShrinkingResult {
  return params.runner(trialId, params.sampleSize, indexInConfig)
}

/**
 * Run shrinking evaluation study
 */
async function runShrinkingStudy(): Promise<void> {
  const sampleSize = 2000 // Higher sample size to ensure witness finding for sparse predicates
  const trialsPerScenario = getSampleSize(2000, 300)

  const scenarios = [
    { name: 'threshold_gt_100', runner: runThresholdTrial, description: 'x > 100 (minimal: 101)' },
    { name: 'modular_10000', runner: runModularTrial, description: 'x % 10000 === 0 (minimal: 10000)' },
    { name: 'square_gt_50000', runner: runSquareRootTrial, description: 'x² > 50000 (minimal: 224)' },
    { name: 'range_1000_10000', runner: runRangeTrial, description: '1000 ≤ x ≤ 10000 (minimal: 1000)' },
    { name: 'composite_gt100_mod7', runner: runCompositeTrial, description: 'x > 100 ∧ x % 7 === 0 (minimal: 105)' }
  ]

  const parameters: ShrinkingParams[] = scenarios.map(s => ({
    name: s.name,
    description: s.description,
    runner: s.runner,
    sampleSize
  }))

  const runner = new ExperimentRunner<ShrinkingParams, ShrinkingResult>({
    name: 'Shrinking Evaluation Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/shrinking.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'witness_found', 'initial_witness',
      'final_witness', 'expected_minimal', 'is_minimal',
      'shrink_candidates_tested', 'shrink_rounds_completed', 'shrink_improvements_made',
      'exploration_time_ms', 'shrinking_time_ms', 'total_elapsed_micros'
    ],
    trialsPerConfig: trialsPerScenario,
    resultToRow: (r: ShrinkingResult) => [
      r.trialId, r.seed, r.scenario, r.witnessFound, r.initialWitness ?? '',
      r.finalWitness ?? '', r.expectedMinimal, r.isMinimal,
      r.shrinkCandidatesTested, r.shrinkRoundsCompleted, r.shrinkImprovementsMade,
      r.explorationTimeMs, r.shrinkingTimeMs, r.totalElapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: FluentCheck effectively minimizes witnesses to near-minimal values')
      console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}]\n`)
      console.log('Scenarios:')
      for (const s of scenarios) {
        console.log(`  - ${s.name}: ${s.description}`)
      }
      console.log(`\nSample size: ${sampleSize}`)
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
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
