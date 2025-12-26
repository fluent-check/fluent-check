/**
 * Length Distribution Study: Finding boundary bugs faster with biased distributions
 *
 * This study examines if different length distributions for collection arbitraries
 * affect the detection rate of length-related bugs.
 *
 * What we measure:
 * 1. Bug detection rate per distribution × bug type
 * 2. Tests to detection
 */

import { integer, Arbitrary } from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, HighResTimer, mulberry32 } from './runner.js'
import path from 'path'

interface LengthDistributionResult {
  trialId: number
  seed: number
  lengthDistribution: 'uniform' | 'geometric' | 'edge_biased'
  bugType: 'empty' | 'single' | 'max_boundary' | 'interior'
  bugDetected: boolean
  testsToDetection: number | null
  testsRun: number
  elapsedMicros: number
}

/**
 * Custom Array Arbitrary that allows specifying length distribution
 */
class CustomArrayArbitrary<A> extends Arbitrary<A[]> {
  constructor(
    public arbitrary: Arbitrary<A>,
    public min = 0,
    public max = 10,
    public distribution: 'uniform' | 'geometric' | 'edge_biased' = 'uniform'
  ) {
    super()
  }

  override size(): any { return { type: 'estimated', value: 1000 } }

  override pick(generator: () => number) {
    let size: number
    const range = this.max - this.min
    const rand = generator()

    if (this.distribution === 'uniform') {
      size = Math.floor(rand * (range + 1)) + this.min
    } else if (this.distribution === 'geometric') {
      // Favor smaller values: p(k) ~ (1-p)^k
      // Simple approximation: square the uniform random to push it toward 0
      size = Math.floor(rand * rand * (range + 1)) + this.min
    } else { // edge_biased
      // Favor min and max
      const MIN_BIASED_PROBABILITY = 0.4
      const MAX_BIASED_PROBABILITY = 0.8
      if (rand < MIN_BIASED_PROBABILITY) size = this.min
      else if (rand < MAX_BIASED_PROBABILITY) size = this.max
      else size = Math.floor(generator() * (range + 1)) + this.min
    }

    const value: A[] = []
    for (let i = 0; i < size; i++) {
      const p = this.arbitrary.pick(generator)
      if (p) value.push(p.value)
    }

    return { value, original: value }
  }

  override canGenerate(_: any) { return true }
}

function runTrial(
  trialId: number,
  distType: 'uniform' | 'geometric' | 'edge_biased',
  bugConfig: { name: string, predicate: (arr: any[]) => boolean }
): LengthDistributionResult {
  const seed = getSeed(trialId)
  const generator = mulberry32(seed)
  const timer = new HighResTimer()

  const arb = new CustomArrayArbitrary(integer(0, 100), 0, 10, distType)
  
  let bugDetected = false
  let testsToDetection = null
  const maxTests = 100

  for (let i = 1; i <= maxTests; i++) {
    const sample = arb.pick(generator)
    if (sample && !bugConfig.predicate(sample.value)) {
      bugDetected = true
      testsToDetection = i
      break
    }
  }

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    lengthDistribution: distType,
    bugType: bugConfig.name as any,
    bugDetected,
    testsToDetection,
    testsRun: bugDetected ? (testsToDetection ?? maxTests) : maxTests,
    elapsedMicros
  }
}

async function runLengthDistributionStudy(): Promise<void> {
  console.log('=== Length Distribution Study ===')
  console.log('Hypothesis: Length-boundary bugs are found faster with edge-biased distribution.\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/length-distribution.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'length_distribution',
    'bug_type',
    'bug_detected',
    'tests_to_detection',
    'tests_run',
    'elapsed_micros'
  ])

  const distributions: ('uniform' | 'geometric' | 'edge_biased')[] = ['uniform', 'geometric', 'edge_biased']
  const bugTypes = [
    { name: 'empty', predicate: (arr: any[]) => arr.length !== 0 },
    { name: 'single', predicate: (arr: any[]) => arr.length !== 1 },
    { name: 'max_boundary', predicate: (arr: any[]) => arr.length !== 10 },
    { name: 'interior', predicate: (arr: any[]) => arr.length !== 5 }
  ]

  const trialsPerConfig = getSampleSize(500, 100)
  const totalTrials = distributions.length * bugTypes.length * trialsPerConfig

  console.log(`Distributions: ${distributions.join(', ')}`)
  console.log(`Bug Types: ${bugTypes.map(b => b.name).join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'LengthDist')

  let trialId = 0
  for (const dist of distributions) {
    for (const bug of bugTypes) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const result = runTrial(trialId, dist, bug)
        writer.writeRow([
          result.trialId,
          result.seed,
          result.lengthDistribution,
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

  console.log(`\n✓ Length Distribution study complete`)
  console.log(`  Output: ${outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLengthDistributionStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runLengthDistributionStudy }
