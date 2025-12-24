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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
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

/**
 * Run a single trial testing bug detection with a specific sampler and bug type
 */
function runTrial(
  trialId: number,
  samplerType: 'biased' | 'random',
  bugType: 'boundary_min' | 'boundary_max' | 'middle' | 'random',
  maxTests: number
): BiasedSamplingResult {
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
  console.log('=== Biased Sampling Impact Study ===')
  console.log('Hypothesis: BiasedSampler detects boundary bugs 2-3x faster than RandomSampler\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/biased-sampling.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'sampler_type',
    'bug_type',
    'bug_detected',
    'tests_to_detection',
    'tests_run',
    'elapsed_micros'
  ])

  // Study configuration
  const bugTypes: Array<'boundary_min' | 'boundary_max' | 'middle' | 'random'> = [
    'boundary_min',
    'boundary_max',
    'middle',
    'random'
  ]
  const samplerTypes: Array<'biased' | 'random'> = ['biased', 'random']
  const maxTests = 100  // Fixed sample size for comparison
  const trialsPerConfig = getSampleSize(500, 100)
  const totalTrials = bugTypes.length * samplerTypes.length * trialsPerConfig

  // Print study parameters
  console.log(`Max tests per trial: ${maxTests}`)
  console.log('Bug types:')
  console.log('  - boundary_min: Fails at x=0 (minimum edge)')
  console.log('  - boundary_max: Fails at x=100 (maximum edge)')
  console.log('  - middle: Fails at x∈[45,55] (interior range)')
  console.log('  - random: Fails at x=42 (arbitrary value)')
  console.log('Sampler types:')
  console.log('  - biased: Corner case prioritization')
  console.log('  - random: Uniform random sampling')
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'BiasedSampling')

  let trialId = 0
  for (const bugType of bugTypes) {
    for (const samplerType of samplerTypes) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const result = runTrial(trialId, samplerType, bugType, maxTests)

        writer.writeRow([
          result.trialId,
          result.seed,
          result.samplerType,
          result.bugType,
          result.bugDetected,
          result.testsToDetection,
          result.testsRun,
          result.elapsedMicros
        ])

        progress.update()
        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Biased sampling study complete`)
  console.log(`  Output: ${outputPath}`)
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
