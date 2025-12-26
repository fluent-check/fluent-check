/**
 * Double-Negation Equivalence Study: First-Class vs Emulated Existential
 *
 * Compares FluentCheck's native `.exists()` support against the double-negation
 * emulation technique: ∃x. P(x) ≡ ¬∀x. ¬P(x)
 *
 * This study tests:
 * 1. Semantic equivalence: Do both approaches find witnesses at the same rate?
 * 2. Shrinking quality: Does first-class exists shrink better than counter-example extraction?
 * 3. Composition complexity: How hard is it to express nested quantifiers?
 *
 * Key insight: Other PBT frameworks CAN emulate exists via double-negation, so
 * FluentCheck's value is NOT "capability" but "first-class expressiveness":
 * - Natural syntax that mirrors mathematical notation
 * - Direct shrinking of witnesses (not counter-examples that happen to be witnesses)
 * - Trivial composition of nested quantifiers
 *
 * IMPORTANT: This study compares within FluentCheck only, eliminating cross-framework
 * confounding factors (different RNGs, overhead, etc.).
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

// Large range for meaningful testing
const LARGE_RANGE_MIN = 1
const LARGE_RANGE_MAX = 1_000_000

interface DoubleNegationResult {
  trialId: number
  seed: number
  scenario: string
  approach: 'first_class' | 'double_negation'
  witnessDensity: number
  sampleSize: number
  witnessFound: boolean
  testsRun: number
  elapsedMicros: number
  witnessValue: number | null
  shrinkCandidatesTested: number
  shrinkImprovementsMade: number
}

interface DoubleNegationParams {
  scenario: {
    name: string
    predicate: (x: number) => boolean
    density: number
    description: string
  }
  sampleSize: number
  approach: 'first_class' | 'double_negation'
}

/**
 * Run first-class exists: .exists('x', arb).then(P)
 */
function runFirstClassExists(
  params: DoubleNegationParams,
  trialId: number
): DoubleNegationResult {
  const { scenario, sampleSize } = params
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => scenario.predicate(x))
    .check()

  const elapsedMicros = timer.elapsedMicros()
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario: scenario.name,
    approach: 'first_class',
    witnessDensity: scenario.density,
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? (result.example as { x: number }).x : null,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0
  }
}

/**
 * Run double-negation emulation: .forall('x', arb).then(!P)
 */
function runDoubleNegation(
  params: DoubleNegationParams,
  trialId: number
): DoubleNegationResult {
  const { scenario, sampleSize } = params
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // ∃x. P(x) ≡ ¬∀x. ¬P(x)
  // We test ∀x. ¬P(x) and look for a counterexample
  // A counterexample to ¬P(x) is a witness for P(x)
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => !scenario.predicate(x)) // ¬P(x)
    .check()

  const elapsedMicros = timer.elapsedMicros()
  const shrinkingStats = result.statistics.shrinking

  // result.satisfiable === false means counterexample found
  // The counterexample is our witness for P(x)
  const witnessFound = !result.satisfiable
  const witnessValue = witnessFound ? (result.example as { x: number }).x : null

  return {
    trialId,
    seed,
    scenario: scenario.name,
    approach: 'double_negation',
    witnessDensity: scenario.density,
    sampleSize,
    witnessFound,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue,
    shrinkCandidatesTested: shrinkingStats?.candidatesTested ?? 0,
    shrinkImprovementsMade: shrinkingStats?.improvementsMade ?? 0
  }
}

/**
 * Scenario definitions
 */
const SCENARIOS = [
  {
    name: 'sparse',
    predicate: (x: number) => x % 10000 === 0,
    density: 0.0001, // 0.01%
    description: '0.01% (x % 10000 === 0)'
  },
  {
    name: 'rare',
    predicate: (x: number) => x % 100 === 0,
    density: 0.01, // 1%
    description: '1% (x % 100 === 0)'
  },
  {
    name: 'moderate',
    predicate: (x: number) => x % 10 === 0,
    density: 0.1, // 10%
    description: '10% (x % 10 === 0)'
  },
  {
    name: 'dense',
    predicate: (x: number) => x % 2 === 0,
    density: 0.5, // 50%
    description: '50% (even numbers)'
  }
]

/**
 * Composition complexity demonstration
 */
interface CompositionResult {
  trialId: number
  seed: number
  approach: 'first_class' | 'double_negation'
  witnessFound: boolean
  testsRun: number
  elapsedMicros: number
  aValue: number | null
  linesOfCode: number  // Conceptual complexity measure
}

interface CompositionParams {
  approach: 'first_class' | 'double_negation'
  sampleSize: number
}

function runFirstClassComposition(params: CompositionParams, trialId: number): CompositionResult {
  const { sampleSize } = params
  const seed = getSeed(trialId + 10000) // Offset seed to match original logic
  const timer = new HighResTimer()

  // Find 'a' such that for all 'b' in range, a + b >= 500000
  // Witness: a >= 501000 (so a + (-1000) >= 500000)
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('a', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .forall('b', fc.integer(-1000, 1000))
    .then(({ a, b }) => a + b >= 500000)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    approach: 'first_class',
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    aValue: result.satisfiable ? (result.example as { a: number }).a : null,
    linesOfCode: 6 // The exists-forall-then chain
  }
}

function runDoubleNegationComposition(params: CompositionParams, trialId: number): CompositionResult {
  const { sampleSize } = params
  const seed = getSeed(trialId + 10000) // Offset seed
  const timer = new HighResTimer()
  let totalTestsRun = 0
  let foundA: number | null = null

  // ∃a. ∀b. P(a,b) ≡ ¬∀a. ∃b. ¬P(a,b)
  // We need to test: ∀a. ∃b. ¬P(a,b)
  // If this FAILS, we have our 'a' value where no 'b' violates P

  // The best we can do with forall:
  const outerResult = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(Math.min(sampleSize, 100)) // Limit outer loop
      .withRandomGenerator(mulberry32, seed))
    .forall('a', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ a }) => {
      // For each 'a', try to find a 'b' that violates P(a,b)
      const innerResult = fc.scenario()
        .config(fc.strategy()
          .withSampleSize(20) // Inner sample budget
          .withRandomGenerator(mulberry32, seed + a)) // Deterministic per-a
        .exists('b', fc.integer(-1000, 1000))
        .then(({ b }) => !(a + b >= 500000)) // ¬P(a,b)
        .check()

      totalTestsRun += innerResult.statistics.testsRun

      // If we found a violating 'b', return true (this 'a' doesn't work)
      // If we couldn't find one, this 'a' might be our witness
      return innerResult.satisfiable
    })
    .check()

  const elapsedMicros = timer.elapsedMicros()
  totalTestsRun += outerResult.statistics.testsRun

  // If outer forall FAILED, we found an 'a' where we couldn't find a violating 'b'
  // That 'a' is our witness
  const witnessFound = !outerResult.satisfiable
  if (witnessFound) {
    foundA = (outerResult.example as { a: number }).a
  }

  return {
    trialId,
    seed,
    approach: 'double_negation',
    witnessFound,
    testsRun: totalTestsRun,
    elapsedMicros,
    aValue: foundA,
    linesOfCode: 20 // Much more complex nested structure
  }
}

/**
 * Run double-negation equivalence study
 */
async function runDoubleNegationStudy(): Promise<void> {
  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/double_negation.csv')
  const compositionPath = path.join(process.cwd(), 'docs/evidence/raw/composition.csv')

  const trialsPerConfig = getSampleSize(100, 25)
  const sampleSizes = [100, 200, 500]

  // Part 1: Simple exists comparison
  const simpleParams: DoubleNegationParams[] = []
  for (const scenario of SCENARIOS) {
    for (const sampleSize of sampleSizes) {
      simpleParams.push({ scenario, sampleSize, approach: 'first_class' })
      simpleParams.push({ scenario, sampleSize, approach: 'double_negation' })
    }
  }

  const simpleRunner = new ExperimentRunner<DoubleNegationParams, DoubleNegationResult>({
    name: 'Double-Negation Equivalence Study - Part 1: Simple Exists',
    outputPath,
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'approach', 'witness_density', 'sample_size',
      'witness_found', 'tests_run', 'elapsed_micros', 'witness_value',
      'shrink_candidates_tested', 'shrink_improvements_made'
    ],
    trialsPerConfig,
    resultToRow: (r: DoubleNegationResult) => [
      r.trialId, r.seed, r.scenario, r.approach, r.witnessDensity, r.sampleSize,
      r.witnessFound, r.testsRun, r.elapsedMicros, r.witnessValue ?? '',
      r.shrinkCandidatesTested, r.shrinkImprovementsMade
    ],
    preRunInfo: () => {
      console.log('Hypothesis: First-class exists provides equal detection with better ergonomics')
      console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}]\n`)
      console.log('Scenarios:')
      for (const s of SCENARIOS) {
        console.log(`  - ${s.name}: density ${s.description}`)
      }
      console.log(`Sample sizes: ${sampleSizes.join(', ')}`)
    }
  })

  await simpleRunner.run(simpleParams, (params, id) => {
    return params.approach === 'first_class' 
      ? runFirstClassExists(params, id) 
      : runDoubleNegation(params, id)
  })

  // Part 2: Composition complexity comparison
  const compositionTrials = getSampleSize(50, 15)
  const compositionSampleSize = 200
  const compositionParams: CompositionParams[] = [
    { approach: 'first_class', sampleSize: compositionSampleSize },
    { approach: 'double_negation', sampleSize: compositionSampleSize }
  ]

  const compositionRunner = new ExperimentRunner<CompositionParams, CompositionResult>({
    name: 'Double-Negation Equivalence Study - Part 2: Composition Complexity',
    outputPath: compositionPath,
    csvHeader: [
      'trial_id', 'seed', 'approach', 'witness_found', 'tests_run',
      'elapsed_micros', 'a_value', 'lines_of_code'
    ],
    trialsPerConfig: compositionTrials,
    resultToRow: (r: CompositionResult) => [
      r.trialId, r.seed, r.approach, r.witnessFound, r.testsRun,
      r.elapsedMicros, r.aValue ?? '', r.linesOfCode
    ],
    preRunInfo: () => {
      console.log('Comparing exists-forall pattern complexity')
      console.log(`Sample size: ${compositionSampleSize}`)
    }
  })

  await compositionRunner.run(compositionParams, (params, id) => {
    return params.approach === 'first_class'
      ? runFirstClassComposition(params, id)
      : runDoubleNegationComposition(params, id)
  })
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDoubleNegationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runDoubleNegationStudy }
