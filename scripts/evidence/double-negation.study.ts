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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
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

/**
 * Run first-class exists: .exists('x', arb).then(P)
 */
function runFirstClassExists(
  trialId: number,
  sampleSize: number,
  seed: number,
  predicate: (x: number) => boolean,
  scenario: string,
  density: number
): DoubleNegationResult {
  const timer = new HighResTimer()

  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => predicate(x))
    .check()

  const elapsedMicros = timer.elapsedMicros()
  const shrinkingStats = result.statistics.shrinking

  return {
    trialId,
    seed,
    scenario,
    approach: 'first_class',
    witnessDensity: density,
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
 * If this FAILS (counterexample found), the counterexample IS our witness for P
 */
function runDoubleNegation(
  trialId: number,
  sampleSize: number,
  seed: number,
  predicate: (x: number) => boolean,
  scenario: string,
  density: number
): DoubleNegationResult {
  const timer = new HighResTimer()

  // ∃x. P(x) ≡ ¬∀x. ¬P(x)
  // We test ∀x. ¬P(x) and look for a counterexample
  // A counterexample to ¬P(x) is a witness for P(x)
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => !predicate(x)) // ¬P(x)
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
    scenario,
    approach: 'double_negation',
    witnessDensity: density,
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
 *
 * First-class: exists(a).forall(b).then(P)
 * Double-negation: ∃a. ∀b. P(a,b) ≡ ¬∀a. ¬∀b. P(a,b) ≡ ¬∀a. ∃b. ¬P(a,b)
 *
 * The double-negation version requires nested scenarios - demonstrably more complex.
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

function runFirstClassComposition(trialId: number, sampleSize: number, seed: number): CompositionResult {
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

function runDoubleNegationComposition(trialId: number, sampleSize: number, seed: number): CompositionResult {
  const timer = new HighResTimer()
  let totalTestsRun = 0
  let foundA: number | null = null

  // ∃a. ∀b. P(a,b) ≡ ¬∀a. ∃b. ¬P(a,b)
  // We need to test: ∀a. ∃b. ¬P(a,b)
  // If this FAILS, we have our 'a' value where no 'b' violates P

  // This is fundamentally harder to express because we need to:
  // 1. Sample 'a' values
  // 2. For each 'a', try to find a 'b' where ¬P(a,b)
  // 3. If we can't find such a 'b' for some 'a', that 'a' is our witness

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
  console.log('\n=== Double-Negation Equivalence Study ===')
  console.log('Hypothesis: First-class exists provides equal detection with better ergonomics')
  console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}]\n`)

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/double_negation.csv')
  const compositionPath = path.join(process.cwd(), 'docs/evidence/raw/composition.csv')

  // Part 1: Simple exists comparison
  const writer = new CSVWriter(outputPath)
  writer.writeHeader([
    'trial_id',
    'seed',
    'scenario',
    'approach',
    'witness_density',
    'sample_size',
    'witness_found',
    'tests_run',
    'elapsed_micros',
    'witness_value',
    'shrink_candidates_tested',
    'shrink_improvements_made'
  ])

  const trialsPerConfig = getSampleSize(100, 25)
  const sampleSizes = [100, 200, 500]

  const totalSimpleTrials = SCENARIOS.length * sampleSizes.length * trialsPerConfig * 2 // *2 for both approaches

  console.log('Part 1: Simple Exists Comparison')
  console.log('Scenarios:')
  for (const s of SCENARIOS) {
    console.log(`  - ${s.name}: density ${s.description}`)
  }
  console.log(`Sample sizes: ${sampleSizes.join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalSimpleTrials}\n`)

  const progress = new ProgressReporter(totalSimpleTrials, 'DoubleNeg')

  let trialId = 0
  for (const scenario of SCENARIOS) {
    for (const sampleSize of sampleSizes) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const seed = getSeed(trialId)

        // Run first-class exists
        const firstClassResult = runFirstClassExists(
          trialId,
          sampleSize,
          seed,
          scenario.predicate,
          scenario.name,
          scenario.density
        )

        writer.writeRow([
          firstClassResult.trialId,
          firstClassResult.seed,
          firstClassResult.scenario,
          firstClassResult.approach,
          firstClassResult.witnessDensity,
          firstClassResult.sampleSize,
          firstClassResult.witnessFound,
          firstClassResult.testsRun,
          firstClassResult.elapsedMicros,
          firstClassResult.witnessValue ?? '',
          firstClassResult.shrinkCandidatesTested,
          firstClassResult.shrinkImprovementsMade
        ])
        progress.update()

        // Run double-negation with same seed for fair comparison
        const doubleNegResult = runDoubleNegation(
          trialId,
          sampleSize,
          seed,
          scenario.predicate,
          scenario.name,
          scenario.density
        )

        writer.writeRow([
          doubleNegResult.trialId,
          doubleNegResult.seed,
          doubleNegResult.scenario,
          doubleNegResult.approach,
          doubleNegResult.witnessDensity,
          doubleNegResult.sampleSize,
          doubleNegResult.witnessFound,
          doubleNegResult.testsRun,
          doubleNegResult.elapsedMicros,
          doubleNegResult.witnessValue ?? '',
          doubleNegResult.shrinkCandidatesTested,
          doubleNegResult.shrinkImprovementsMade
        ])
        progress.update()

        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()
  console.log(`  Output: ${outputPath}`)

  // Part 2: Composition complexity comparison
  console.log('\nPart 2: Composition Complexity (exists-forall pattern)')

  const compositionWriter = new CSVWriter(compositionPath)
  compositionWriter.writeHeader([
    'trial_id',
    'seed',
    'approach',
    'witness_found',
    'tests_run',
    'elapsed_micros',
    'a_value',
    'lines_of_code'
  ])

  const compositionTrials = getSampleSize(50, 15)
  const compositionSampleSize = 200

  console.log(`Trials: ${compositionTrials}`)
  console.log(`Sample size: ${compositionSampleSize}\n`)

  const compositionProgress = new ProgressReporter(compositionTrials * 2, 'Composition')

  for (let i = 0; i < compositionTrials; i++) {
    const seed = getSeed(i + 10000) // Different seed range

    const firstClassResult = runFirstClassComposition(i, compositionSampleSize, seed)
    compositionWriter.writeRow([
      firstClassResult.trialId,
      firstClassResult.seed,
      firstClassResult.approach,
      firstClassResult.witnessFound,
      firstClassResult.testsRun,
      firstClassResult.elapsedMicros,
      firstClassResult.aValue ?? '',
      firstClassResult.linesOfCode
    ])
    compositionProgress.update()

    const doubleNegResult = runDoubleNegationComposition(i, compositionSampleSize, seed)
    compositionWriter.writeRow([
      doubleNegResult.trialId,
      doubleNegResult.seed,
      doubleNegResult.approach,
      doubleNegResult.witnessFound,
      doubleNegResult.testsRun,
      doubleNegResult.elapsedMicros,
      doubleNegResult.aValue ?? '',
      doubleNegResult.linesOfCode
    ])
    compositionProgress.update()
  }

  compositionProgress.finish()
  await compositionWriter.close()

  console.log(`  Output: ${compositionPath}`)
  console.log(`\n✓ Double-negation equivalence study complete`)
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
