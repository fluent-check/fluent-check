/**
 * Filter Cascade Impact Study: Does size estimation degrade with filter depth?
 *
 * Tests whether chaining multiple filters causes size estimation errors to
 * accumulate, and whether credible intervals maintain proper coverage.
 *
 * IMPORTANT: This validates ArbitraryFilter's size estimation mechanism.
 * Filters estimate size via sampling, which should provide reliable bounds
 * even when chained multiple times.
 *
 * What we measure:
 * 1. Relative estimation error vs chain depth
 * 2. Credible interval coverage rate (should be ~95%)
 * 3. Error accumulation pattern
 */

import * as fc from '../../src/index.js'
import { FilteredArbitraryLegacy } from '../../src/arbitraries/FilteredArbitraryLegacy.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface FilterCascadeResult {
  trialId: number
  implementation: string
  seed: number
  chainDepth: number
  filterPassRate: number
  compositePassRate: number
  estimatedSize: number
  actualDistinctValues: number
  credibleIntervalLower: number
  credibleIntervalUpper: number
  trueValueInCI: boolean
  relativeError: number
  elapsedMicros: number
}

interface FilterCascadeParams {
  chainDepth: number
  filterPassRate: number
  useLegacy: boolean
}

/**
 * Count actual distinct values by exhaustive enumeration
 * Uses adaptive sampling with saturation detection
 */
function countDistinct(arb: fc.Arbitrary<number>, maxSamples: number = 100000): number {
  const seen = new Set<number>()
  const generator = mulberry32(12345)  // Fixed seed for consistent counting
  let lastNewValue = 0

  // Use adaptive threshold based on current set size
  // Smaller sets need less patience, larger sets need more
  const getSaturationThreshold = (setSize: number): number => {
    if (setSize < 10) return 5000
    if (setSize < 50) return 10000
    if (setSize < 100) return 20000
    return 30000
  }

  for (let i = 0; i < maxSamples; i++) {
    const pick = arb.pick(generator)
    const sizeBefore = seen.size
    // Extract the actual value from the pick result
    const actualValue = typeof pick === 'object' && pick !== null && 'value' in pick ? pick.value : pick
    seen.add(actualValue as number)

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
 * Run a single trial measuring filter cascade estimation
 */
function runTrial(
  params: FilterCascadeParams,
  trialId: number
): FilterCascadeResult {
  const { chainDepth, filterPassRate, useLegacy } = params
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Build filter cascade: start with base arbitrary, add filters
  const baseSize = 1000
  let arb: fc.Arbitrary<number> = fc.integer(0, baseSize - 1)

  // Calculate theoretical composite pass rate
  const compositePassRate = Math.pow(filterPassRate, chainDepth)

  // MurmurHash3 32-bit mixing function for robust deterministic hashing
  const hash32 = (value: number, seed: number): number => {
    let h = seed | 0;
    let k = value | 0;

    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = Math.imul(h, 5) + 0xe6546b64;

    // Finalize
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;

    return h >>> 0;
  }

  // Chain filters using deterministic hash-based selection
  // This simulates independent filters with the given pass rate
  const isSelected = (value: number, layer: number, rate: number): boolean => {
    // Use layer as seed and value as key
    const h = hash32(value, layer);
    // Normalize to [0, 1)
    const prob = h / 4294967296;
    return prob < rate;
  }

  for (let i = 0; i < chainDepth; i++) {
    const layer = i
    const pred = (x: number) => isSelected(x, layer, filterPassRate)
    
    if (useLegacy) {
      // Manual wrapping for legacy implementation
      arb = new FilteredArbitraryLegacy(arb, pred) as unknown as fc.Arbitrary<number>
    } else {
      // Standard API for fixed implementation
      arb = arb.filter(pred)
    }
  }

  // Get size estimation with credible interval
  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  
  let credibleIntervalLower = estimatedSize
  let credibleIntervalUpper = estimatedSize
  
  if (sizeInfo.type === 'estimated') {
    credibleIntervalLower = sizeInfo.credibleInterval[0]
    credibleIntervalUpper = sizeInfo.credibleInterval[1]
  }

  // Count actual distinct values
  const actualDistinctValues = countDistinct(arb, 10000)

  // Check if true value is in credible interval
  const trueValueInCI = actualDistinctValues >= credibleIntervalLower &&
                        actualDistinctValues <= credibleIntervalUpper

  // Calculate relative error
  // Handle case where actual is 0 to avoid Infinity
  const relativeError = actualDistinctValues === 0 
    ? (estimatedSize === 0 ? 0 : 1.0) // If actual is 0, estimate 0 is perfect, else 100% error
    : (estimatedSize - actualDistinctValues) / actualDistinctValues

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    implementation: useLegacy ? 'legacy' : 'fixed',
    seed,
    chainDepth,
    filterPassRate,
    compositePassRate,
    estimatedSize,
    actualDistinctValues,
    credibleIntervalLower,
    credibleIntervalUpper,
    trueValueInCI,
    relativeError,
    elapsedMicros
  }
}

/**
 * Run filter cascade impact study
 */
async function runFilterCascadeStudy(): Promise<void> {
  const chainDepths = [1, 2, 3, 5]
  const filterPassRates = [0.5, 0.7, 0.9]
  const implementations = ['legacy', 'fixed']

  const parameters: FilterCascadeParams[] = []
  for (const impl of implementations) {
    const useLegacy = impl === 'legacy'
    for (const chainDepth of chainDepths) {
      for (const filterPassRate of filterPassRates) {
        parameters.push({
          chainDepth,
          filterPassRate,
          useLegacy
        })
      }
    }
  }

  const runner = new ExperimentRunner<FilterCascadeParams, FilterCascadeResult>({
    name: 'Filter Cascade Impact Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/filter-cascade.csv'),
    csvHeader: [
      'trial_id', 'implementation', 'seed', 'chain_depth', 'filter_pass_rate',
      'composite_pass_rate', 'estimated_size', 'actual_distinct_values',
      'credible_interval_lower', 'credible_interval_upper', 'true_value_in_ci',
      'relative_error', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: FilterCascadeResult) => [
      r.trialId, r.implementation, r.seed, r.chainDepth, r.filterPassRate.toFixed(2),
      r.compositePassRate.toFixed(4), r.estimatedSize, r.actualDistinctValues,
      r.credibleIntervalLower, r.credibleIntervalUpper, r.trueValueInCI,
      r.relativeError.toFixed(6), r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Size estimation accuracy degrades with filter depth\n')
      console.log(`Base arbitrary: integer(0, 999) (size = 1000)`)
      console.log(`Implementations: ${implementations.join(', ')}`)
      console.log(`Chain depths: ${chainDepths.join(', ')}`)
      console.log(`Filter pass rates: ${filterPassRates.map(r => `${(r*100).toFixed(0)}%`).join(', ')}`)
    }
  })

  await runner.run(parameters, runTrial)
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runFilterCascadeStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runFilterCascadeStudy }
