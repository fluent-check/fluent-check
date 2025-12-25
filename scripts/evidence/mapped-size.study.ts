/**
 * Mapped Arbitrary Size Study: Do non-bijective maps cause size overestimation?
 *
 * Tests whether non-bijective mappings cause size overestimation proportional
 * to the collision rate, and quantifies the impact on union branch weighting.
 *
 * IMPORTANT: This validates MappedArbitrary's size estimation mechanism.
 * Currently, mapped arbitraries preserve the base size even if the mapping
 * is not injective, which can lead to overestimation.
 *
 * What we measure:
 * 1. Size ratio (reported / actual distinct) per map type
 * 2. Whether ratio matches expected collision rate
 * 3. Impact on union branch weighting
 */

import * as fc from '../../src/index.js'
import { MappedArbitraryLegacy } from '../../src/arbitraries/MappedArbitraryLegacy.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface MappedSizeResult {
  trialId: number
  implementation: string
  seed: number
  mapType: 'bijective' | 'surjective_10to1' | 'surjective_5to1'
  baseSize: number
  reportedSize: number
  actualDistinctValues: number
  sizeRatio: number
  elapsedMicros: number
}

/**
 * Count actual distinct values by exhaustive sampling
 * Uses adaptive sampling with saturation detection
 */
function countDistinct<T>(arb: fc.Arbitrary<T>, maxSamples: number = 100000): number {
  const seen = new Set<string>()
  const rng = mulberry32(12345)  // Fixed seed for consistency
  let lastNewValue = 0

  // Use adaptive threshold based on current set size
  const getSaturationThreshold = (setSize: number): number => {
    if (setSize < 10) return 5000
    if (setSize < 50) return 10000
    if (setSize < 100) return 20000
    return 30000
  }

  for (let i = 0; i < maxSamples; i++) {
    const pick = arb.pick(rng)
    const sizeBefore = seen.size
    // Extract the actual value from the pick result
    const actualValue = typeof pick === 'object' && pick !== null && 'value' in pick ? pick.value : pick
    seen.add(JSON.stringify(actualValue))

    if (seen.size > sizeBefore) {
      lastNewValue = i
    }

    // Adaptive early termination
    const threshold = getSaturationThreshold(seen.size)
    if (i - lastNewValue > threshold) {
      break
    }
  }

  return seen.size
}

/**
 * Run a single trial measuring mapped arbitrary size
 */
function runTrial(
  trialId: number,
  mapType: 'bijective' | 'surjective_10to1' | 'surjective_5to1',
  useLegacy: boolean
): MappedSizeResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Base arbitrary: integer(0, 99) with 100 distinct values
  const baseArbitrary = fc.integer(0, 99)
  const baseSize = 100

  // Create mapped arbitrary based on type
  let mapFn: (x: number) => number

  switch (mapType) {
    case 'bijective':
      // x => x * 2: Still 100 distinct values
      mapFn = x => x * 2
      break
    case 'surjective_10to1':
      // x => x % 10: Maps to 10 distinct values (10-to-1 collision)
      mapFn = x => x % 10
      break
    case 'surjective_5to1':
      // x => x % 20: Maps to 20 distinct values (5-to-1 collision)
      mapFn = x => x % 20
      break
  }

  let arb: fc.Arbitrary<number>
  if (useLegacy) {
    arb = new MappedArbitraryLegacy(baseArbitrary, mapFn) as unknown as fc.Arbitrary<number>
  } else {
    arb = baseArbitrary.map(mapFn)
  }

  // Get reported size from arbitrary
  const sizeInfo = arb.size()
  const reportedSize = sizeInfo.value

  // Count actual distinct values
  const actualDistinctValues = countDistinct(arb, 10000)

  // Calculate size ratio
  const sizeRatio = reportedSize / actualDistinctValues

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    implementation: useLegacy ? 'legacy' : 'fixed',
    seed,
    mapType,
    baseSize,
    reportedSize,
    actualDistinctValues,
    sizeRatio,
    elapsedMicros
  }
}

/**
 * Run mapped arbitrary size study
 */
async function runMappedSizeStudy(): Promise<void> {
  console.log('=== Mapped Arbitrary Size Study ===')
  console.log('Hypothesis: Non-bijective maps cause size overestimation proportional to collision rate\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/mapped-size.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'implementation',
    'seed',
    'map_type',
    'base_size',
    'reported_size',
    'actual_distinct_values',
    'size_ratio',
    'elapsed_micros'
  ])

  // Study configuration
  const mapTypes: Array<'bijective' | 'surjective_10to1' | 'surjective_5to1'> = [
    'bijective',
    'surjective_10to1',
    'surjective_5to1'
  ]
  const implementations = ['legacy', 'fixed']
  const trialsPerConfig = getSampleSize(200, 50)
  const totalTrials = mapTypes.length * implementations.length * trialsPerConfig

  // Print study parameters
  console.log(`Base arbitrary: integer(0, 99) (100 distinct values)`)
  console.log(`Implementations: ${implementations.join(', ')}`)
  console.log(`Map types:`)
  console.log(`  - bijective: x => x * 2 (100 distinct values, ratio = 1.0)`)
  console.log(`  - surjective_10to1: x => x % 10 (10 distinct values, ratio = 10.0)`)
  console.log(`  - surjective_5to1: x => x % 20 (20 distinct values, ratio = 5.0)`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'MappedSize')

  let trialId = 0
  for (const impl of implementations) {
    const useLegacy = impl === 'legacy'
    for (const mapType of mapTypes) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const result = runTrial(trialId, mapType, useLegacy)

        writer.writeRow([
          result.trialId,
          result.implementation,
          result.seed,
          result.mapType,
          result.baseSize,
          result.reportedSize,
          result.actualDistinctValues,
          result.sizeRatio.toFixed(6),
          result.elapsedMicros
        ])

        progress.update()
        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Mapped size study complete`)
  console.log(`  Output: ${outputPath}`)
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runMappedSizeStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runMappedSizeStudy }
