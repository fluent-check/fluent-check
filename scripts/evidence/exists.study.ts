/**
 * Existential Quantifier Study: Does FluentCheck efficiently find witnesses?
 * 
 * Tests witness detection across different scenarios:
 * - Sparse witnesses (needle in haystack)
 * - Dense witnesses (many valid values)
 * - Mixed quantifier patterns (exists-forall, forall-exists)
 * 
 * Hypothesis: FluentCheck's .exists() efficiently finds witnesses with
 * detection rates proportional to witness density and sample size.
 * 
 * For a witness density `d` and sample size `n`, expected detection rate
 * is approximately `1 - (1-d)^n` (geometric distribution).
 * 
 * IMPORTANT: We use large ranges (1M+ values) with modular arithmetic predicates
 * to avoid space exhaustion effects. This ensures witness density is independent
 * of range size and each sample is truly independent.
 */

import * as fc from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

// Large range to avoid space exhaustion/saturation effects
// With 1M values and max 500 samples, we cover only 0.05% of the space
const LARGE_RANGE_MIN = 1
const LARGE_RANGE_MAX = 1_000_000

interface ExistsResult {
  trialId: number
  seed: number
  scenario: string
  witnessDensity: number
  sampleSize: number
  witnessFound: boolean
  testsRun: number
  elapsedMicros: number
  witnessValue: string
}

/**
 * Scenario 1: Sparse Witness (needle in haystack)
 * Witness density: 0.01% (multiples of 10000)
 * 
 * Using modular arithmetic ensures density is independent of range.
 * In [1, 1M]: exactly 100 witnesses (10000, 20000, ..., 1000000)
 * Density = 100/1M = 0.0001 = 0.01%
 */
function runSparseTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Find any multiple of 10000 in [1, 1M]
  // Witness density: 0.01% (100 values out of 1M)
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x % 10000 === 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    scenario: 'sparse',
    witnessDensity: 0.0001, // 0.01%
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Scenario 2: Dense Witness (many valid values)
 * Witness density: 50% (even numbers)
 * 
 * Using x % 2 === 0 gives exactly 50% density for any range.
 */
function runDenseTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Find any even number in [1, 1M]
  // Witness density: 50%
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x % 2 === 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    scenario: 'dense',
    witnessDensity: 0.5, // 50%
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Scenario 3: Moderate Witness
 * Witness density: 10% (multiples of 10)
 */
function runModerateTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Find any multiple of 10 in [1, 1M]
  // Witness density: 10%
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x % 10 === 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    scenario: 'moderate',
    witnessDensity: 0.1, // 10%
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Scenario 4: Mixed Quantifiers - exists-forall pattern
 * Find a such that for all b, a + b >= threshold
 * 
 * Using large ranges for 'a' and small range for 'b' to test the pattern.
 * Witness: a >= 10000 (so a + (-10000) >= 0)
 * Density in [1, 1M]: ~99% of values satisfy a >= 10000
 * 
 * We use a more challenging setup: a must be >= 100000 (top 90%)
 * to avoid trivial success.
 */
function runExistsForallTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Find a such that a + b >= 500000 for all b in [-1000, 1000]
  // Witness: a >= 501000 
  // Density in [1, 1M]: (1M - 501000 + 1) / 1M ≈ 50%
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
    scenario: 'exists_forall',
    witnessDensity: 0.5, // ~50% (values >= 501000)
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Scenario 5: Mixed Quantifiers - forall-exists pattern
 * For all a, exists b such that a + b === target
 * 
 * This pattern is inherently harder because we need to find
 * a witness for EVERY value of 'a'.
 * 
 * Using small range for 'a' (to limit forall iterations) and
 * large range for 'b' to make witness finding non-trivial.
 * 
 * Witness density per 'a': 1/range_b ≈ 0.0001% (one exact value)
 * Overall success requires finding witness for ALL 'a' values.
 */
function runForallExistsTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // For each a in [1, 10], find b such that a + b = 1000
  // Witness for each a: b = 1000 - a (exists in [1, 10000])
  // Per-a density: 1/10000 = 0.01%
  // But we need ALL 10 'a' values to succeed
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .forall('a', fc.integer(1, 10))
    .exists('b', fc.integer(1, 10000))
    .then(({ a, b }) => a + b === 1000)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    scenario: 'forall_exists',
    // Per-a density is 0.01%, but overall success is much harder
    witnessDensity: 0.0001, // 0.01% per forall value
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Scenario 6: Rare Witness
 * Witness density: 1% (multiples of 100)
 */
function runRareTrial(
  trialId: number,
  sampleSize: number
): ExistsResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Find any multiple of 100 in [1, 1M]
  // Witness density: 1% (10000 values out of 1M)
  const result = fc.scenario()
    .config(fc.strategy()
      .withSampleSize(sampleSize)
      .withRandomGenerator(mulberry32, seed))
    .exists('x', fc.integer(LARGE_RANGE_MIN, LARGE_RANGE_MAX))
    .then(({ x }) => x % 100 === 0)
    .check()

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    scenario: 'rare',
    witnessDensity: 0.01, // 1%
    sampleSize,
    witnessFound: result.satisfiable,
    testsRun: result.statistics.testsRun,
    elapsedMicros,
    witnessValue: result.satisfiable ? JSON.stringify(result.example) : ''
  }
}

/**
 * Run existential quantifier study
 */
async function runExistsStudy(): Promise<void> {
  console.log('\n=== Existential Quantifier Study ===')
  console.log('Hypothesis: FluentCheck efficiently finds witnesses for existential properties')
  console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}] (avoids space exhaustion)\n`)

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/exists.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'scenario',
    'witness_density',
    'sample_size',
    'witness_found',
    'tests_run',
    'elapsed_micros',
    'witness_value'
  ])

  const trialsPerScenario = getSampleSize(200, 50)
  
  // Sample sizes to test
  const sampleSizes = [50, 100, 200, 500]
  
  // Scenarios to run
  const scenarios = [
    { name: 'sparse', runner: runSparseTrial, density: '0.01% (x % 10000 == 0)' },
    { name: 'rare', runner: runRareTrial, density: '1% (x % 100 == 0)' },
    { name: 'moderate', runner: runModerateTrial, density: '10% (x % 10 == 0)' },
    { name: 'dense', runner: runDenseTrial, density: '50% (even numbers)' },
    { name: 'exists_forall', runner: runExistsForallTrial, density: '~50% (a >= 501000)' },
    { name: 'forall_exists', runner: runForallExistsTrial, density: '0.01% per a (exact match)' }
  ]

  const totalTrials = scenarios.length * sampleSizes.length * trialsPerScenario
  
  console.log('Scenarios:')
  for (const s of scenarios) {
    console.log(`  - ${s.name}: witness density ${s.density}`)
  }
  console.log(`\nSample sizes: ${sampleSizes.join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerScenario}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'Exists')

  let trialId = 0
  for (const scenario of scenarios) {
    for (const sampleSize of sampleSizes) {
      for (let i = 0; i < trialsPerScenario; i++) {
        const result = scenario.runner(trialId, sampleSize)

        writer.writeRow([
          result.trialId,
          result.seed,
          result.scenario,
          result.witnessDensity,
          result.sampleSize,
          result.witnessFound,
          result.testsRun,
          result.elapsedMicros,
          result.witnessValue
        ])

        progress.update()
        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Existential quantifier study complete`)
  console.log(`  Output: ${outputPath}`)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExistsStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runExistsStudy }
