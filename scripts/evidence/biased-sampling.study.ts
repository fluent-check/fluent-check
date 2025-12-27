/**
 * Biased Sampling Impact Study: Does bias toward corner cases improve bug detection?
 *
 * Compares bug detection rates between BiasedSampler and RandomSampler for different bug types:
 * - Boundary bugs (min/max edge values)
 * - Middle-range bugs
 * - Arbitrary value bugs
 *
 * IMPORTANT: BiasedSampler prioritizes corner cases, which should improve detection
 * of boundary bugs while having minimal impact on other bug types.
 *
 * What we measure:
 * 1. Detection rate per bug type × sampler type
 * 2. Tests to detection (when bug is found)
 * 3. Execution time
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface BiasedSamplingResult {
  trialId: number
  seed: number
  samplerType: 'biased' | 'random'
  bugType: 'boundary_min' | 'boundary_max' | 'middle' | 'random'
  bugDetected: boolean
  testsToDetection: number | null  // null if not detected
  testsRun: number
  elapsedMicros: number
}

interface BiasedSamplingParams {
  samplerType: 'biased' | 'random'
  bugType: 'boundary_min' | 'boundary_max' | 'middle' | 'random'
  maxTests: number
}

/**
 * Run a single trial testing bug detection with a specific sampler and bug type
 */
function runTrial(
  params: BiasedSamplingParams,
  trialId: number
): BiasedSamplingResult {
  const { samplerType, bugType, maxTests } = params
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Define bug predicates
  const bugPredicates: Record<string, (x: number) => boolean> = {
    boundary_min: (x: number) => x !== 0,        // Fails at minimum
    boundary_max: (x: number) => x !== 100,      // Fails at maximum
    middle: (x: number) => x < 45 || x > 55,     // Fails in middle range [45-55]
    random: (x: number) => x !== 42              // Fails at arbitrary value
  }

  const predicate = bugPredicates[bugType]

  // Build strategy with appropriate sampler
  let strategy = fc.strategy()
    .withSampleSize(maxTests)
    .withRandomGenerator(mulberry32, seed)

  if (samplerType === 'biased') {
    strategy = strategy.withBias()
  }

  const result = fc.scenario()
    .config(strategy)
    .forall('x', fc.integer(0, 100))
    .then(({ x }) => predicate(x))
    .check()

  const elapsedMicros = timer.elapsedMicros()

  // Calculate tests to detection (null if not detected)
  const testsToDetection = result.satisfiable ? null : result.statistics.testsRun

  return {
    trialId,
    seed,
    samplerType,
    bugType,
    bugDetected: !result.satisfiable,
    testsToDetection,
    testsRun: result.statistics.testsRun,
    elapsedMicros
  }
}

/**
 * Run biased sampling impact study
 */
async function runBiasedSamplingStudy(): Promise<void> {
  const bugTypes: Array<'boundary_min' | 'boundary_max' | 'middle' | 'random'> = [
    'boundary_min',
    'boundary_max',
    'middle',
    'random'
  ]
  const samplerTypes: Array<'biased' | 'random'> = ['biased', 'random']
  const maxTests = 100  // Fixed sample size for comparison

  const parameters: BiasedSamplingParams[] = []
  for (const bugType of bugTypes) {
    for (const samplerType of samplerTypes) {
      parameters.push({
        samplerType,
        bugType,
        maxTests
      })
    }
  }

  const runner = new ExperimentRunner<BiasedSamplingParams, BiasedSamplingResult>({
    name: 'Biased Sampling Impact Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/biased-sampling.csv'),
    csvHeader: [
      'trial_id', 'seed', 'sampler_type', 'bug_type', 'bug_detected',
      'tests_to_detection', 'tests_run', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: BiasedSamplingResult) => [
      r.trialId, r.seed, r.samplerType, r.bugType, r.bugDetected,
      r.testsToDetection, r.testsRun, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: BiasedSampler detects boundary bugs 2-3x faster than RandomSampler\n')
      console.log(`Max tests per trial: ${maxTests}`)
      console.log('Bug types:')
      console.log('  - boundary_min: Fails at x=0 (minimum edge)')
      console.log('  - boundary_max: Fails at x=100 (maximum edge)')
      console.log('  - middle: Fails at x∈[45,55] (interior range)')
      console.log('  - random: Fails at x=42 (arbitrary value)')
      console.log('Sampler types:')
      console.log('  - biased: Corner case prioritization')
      console.log('  - random: Uniform random sampling')
    }
  })

  await runner.run(parameters, runTrial)
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runBiasedSamplingStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runBiasedSamplingStudy }
