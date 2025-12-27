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
import { ExperimentRunner, getSeed, getSampleSize, HighResTimer, mulberry32 } from './runner.js'
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

interface LengthDistributionParams {
  distType: 'uniform' | 'geometric' | 'edge_biased'
  bugConfig: { name: string, predicate: (arr: any[]) => boolean }
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
  params: LengthDistributionParams,
  trialId: number
): LengthDistributionResult {
  const { distType, bugConfig } = params
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
  const distributions: ('uniform' | 'geometric' | 'edge_biased')[] = ['uniform', 'geometric', 'edge_biased']
  const bugTypes = [
    { name: 'empty', predicate: (arr: any[]) => arr.length !== 0 },
    { name: 'single', predicate: (arr: any[]) => arr.length !== 1 },
    { name: 'max_boundary', predicate: (arr: any[]) => arr.length !== 10 },
    { name: 'interior', predicate: (arr: any[]) => arr.length !== 5 }
  ]

  const parameters: LengthDistributionParams[] = []
  for (const distType of distributions) {
    for (const bugConfig of bugTypes) {
      parameters.push({
        distType,
        bugConfig
      })
    }
  }

  const runner = new ExperimentRunner<LengthDistributionParams, LengthDistributionResult>({
    name: 'Length Distribution Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/length-distribution.csv'),
    csvHeader: [
      'trial_id', 'seed', 'length_distribution', 'bug_type', 'bug_detected',
      'tests_to_detection', 'tests_run', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: LengthDistributionResult) => [
      r.trialId, r.seed, r.lengthDistribution, r.bugType, r.bugDetected,
      r.testsToDetection, r.testsRun, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Length-boundary bugs are found faster with edge-biased distribution.\n')
      console.log(`Distributions: ${distributions.join(', ')}`)
      console.log(`Bug Types: ${bugTypes.map(b => b.name).join(', ')}`)
    }
  })

  await runner.run(parameters, runTrial)
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
