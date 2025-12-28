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
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
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

interface ExistsParams {
  name: string
  density: string
  sampleSize: number
  runner: (trialId: number, sampleSize: number) => ExistsResult
}

/**
 * Scenario 1: Sparse Witness (needle in haystack)
 * Witness density: 0.01% (multiples of 10000)
 */
function runSparseTrial(
  trialId: number,
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
 */
function runDenseTrial(
  trialId: number,
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
 */
function runExistsForallTrial(
  trialId: number,
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
 */
function runForallExistsTrial(
  trialId: number,
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
  sampleSize: number,
  indexInConfig: number
): ExistsResult {
  const seed = getSeed(indexInConfig)
  const timer = new HighResTimer()

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
 * Dispatcher for running trials
 */
function runTrial(
  params: ExistsParams,
  trialId: number,
  indexInConfig: number
): ExistsResult {
  return params.runner(trialId, params.sampleSize, indexInConfig)
}

/**
 * Run existential quantifier study
 */
async function runExistsStudy(): Promise<void> {
  const sampleSizes = [50, 100, 200, 500]
  
  const scenarios = [
    { name: 'sparse', runner: runSparseTrial, density: '0.01% (x % 10000 == 0)' },
    { name: 'rare', runner: runRareTrial, density: '1% (x % 100 == 0)' },
    { name: 'moderate', runner: runModerateTrial, density: '10% (x % 10 == 0)' },
    { name: 'dense', runner: runDenseTrial, density: '50% (even numbers)' },
    { name: 'exists_forall', runner: runExistsForallTrial, density: '~50% (a >= 501000)' },
    { name: 'forall_exists', runner: runForallExistsTrial, density: '0.01% per a (exact match)' }
  ]

  const parameters: ExistsParams[] = []
  for (const scenario of scenarios) {
    for (const sampleSize of sampleSizes) {
      parameters.push({
        name: scenario.name,
        density: scenario.density,
        sampleSize,
        runner: scenario.runner
      })
    }
  }

  const runner = new ExperimentRunner<ExistsParams, ExistsResult>({
    name: 'Existential Quantifier Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/exists.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'witness_density', 'sample_size',
      'witness_found', 'tests_run', 'elapsed_micros', 'witness_value'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: ExistsResult) => [
      r.trialId, r.seed, r.scenario, r.witnessDensity, r.sampleSize,
      r.witnessFound, r.testsRun, r.elapsedMicros, r.witnessValue
    ],
    preRunInfo: () => {
      console.log('Hypothesis: FluentCheck efficiently finds witnesses for existential properties')
      console.log(`Search space: [${LARGE_RANGE_MIN.toLocaleString()}, ${LARGE_RANGE_MAX.toLocaleString()}] (avoids space exhaustion)\n`)
      console.log('Scenarios:')
      for (const s of scenarios) {
        console.log(`  - ${s.name}: witness density ${s.density}`)
      }
      console.log(`\nSample sizes: ${sampleSizes.join(', ')}`)
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
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
