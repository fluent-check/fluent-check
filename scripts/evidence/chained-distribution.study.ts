/**
 * Chained Distribution Study: Predictability of flatMap distributions
 *
 * This study verifies that chaining arbitraries via flatMap produces predictable
 * non-uniform distributions. Specifically, we test the chain:
 * integer(1, 10).flatMap(n => integer(1, n))
 *
 * Theoretical probability P(k) = (11 - k) / 55 for k in 1..10.
 *
 * What we measure:
 * 1. Base value generated (from the first arbitrary)
 * 2. Result value generated (from the chained arbitrary)
 */

import { integer } from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, HighResTimer, mulberry32 } from './runner.js'
import path from 'path'

interface ChainedDistributionResult {
  trialId: number
  seed: number
  baseValue: number
  resultValue: number
  elapsedMicros: number
}

/**
 * Single trial function - generates samples for the chained distribution
 */
function runTrial(
  trialId: number,
  samplesPerTrial: number
): ChainedDistributionResult[] {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  const capturingArb = integer(1, 10).chain(baseValue => 
    integer(1, baseValue).map(resultValue => ({ baseValue, resultValue }))
  )

  const generator = mulberry32(seed)
  const sampler = capturingArb.sample(samplesPerTrial, generator)
  const elapsedMicros = timer.elapsedMicros()

  return sampler.map((val, i) => ({
    trialId: trialId * samplesPerTrial + i,
    seed,
    baseValue: val.value.baseValue,
    resultValue: val.value.resultValue,
    elapsedMicros: Math.floor(elapsedMicros / samplesPerTrial) // Average per sample
  }))
}

async function runChainedDistributionStudy(): Promise<void> {
  console.log('=== Chained Distribution Study ===')
  console.log('Hypothesis: flatMap creates predictable non-uniform distributions.\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/chained-distribution.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'base_value',
    'result_value',
    'elapsed_micros'
  ])

  const samplesPerTrial = getSampleSize(50000, 5000)
  const trialsPerConfig = getSampleSize(10, 2)
  const totalTrials = trialsPerConfig

  console.log(`Samples per trial: ${samplesPerTrial}`)
  console.log(`Trials: ${trialsPerConfig}`)
  console.log(`Total samples: ${samplesPerTrial * trialsPerConfig}\n`)

  const progress = new ProgressReporter(totalTrials, 'ChainedDist')

  for (let i = 0; i < trialsPerConfig; i++) {
    const results = runTrial(i, samplesPerTrial)

    for (const result of results) {
      writer.writeRow([
        result.trialId,
        result.seed,
        result.baseValue,
        result.resultValue,
        result.elapsedMicros
      ])
    }

    progress.update()
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Chained Distribution study complete`)
  console.log(`  Output: ${outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runChainedDistributionStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runChainedDistributionStudy }