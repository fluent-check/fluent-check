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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface FilterCascadeResult {
  trialId: number
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

/**
 * Count actual distinct values by exhaustive enumeration
 * Returns early if we detect saturation (no new values in last 1000 samples)
 */
function countDistinct(arb: fc.Arbitrary<number>, maxSamples: number = 50000): number {
  const seen = new Set<number>()
  const generator = mulberry32(12345)  // Fixed seed for consistent counting
  let lastNewValue = 0

  for (let i = 0; i < maxSamples; i++) {
    const pick = arb.pick(generator)
    const sizeBefore = seen.size
    seen.add(pick)

    if (seen.size > sizeBefore) {
      lastNewValue = i
    }

    // Early termination if no new values in 2000 samples
    if (i - lastNewValue > 2000) {
      break
    }
  }

  return seen.size
}

/**
 * Run a single trial measuring filter cascade estimation
 */
function runTrial(
  trialId: number,
  chainDepth: number,
  filterPassRate: number
): FilterCascadeResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Build filter cascade: start with base arbitrary, add filters
  const baseSize = 1000
  let arb: fc.Arbitrary<number> = fc.integer(0, baseSize - 1)

  // Calculate theoretical composite pass rate
  const compositePassRate = Math.pow(filterPassRate, chainDepth)

  // Chain filters using simple modulo checks
  // Each filter keeps approximately filterPassRate of values
  const modulus = Math.round(1 / filterPassRate)

  for (let i = 0; i < chainDepth; i++) {
    // Use different offset per filter to avoid 100% overlap
    const offset = i
    arb = arb.filter(x => (x + offset) % modulus === 0)
  }

  // Get size estimation with credible interval
  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value
  const credibleIntervalLower = sizeInfo.lowerBound ?? estimatedSize
  const credibleIntervalUpper = sizeInfo.upperBound ?? estimatedSize

  // Count actual distinct values
  const actualDistinctValues = countDistinct(arb, 10000)

  // Check if true value is in credible interval
  const trueValueInCI = actualDistinctValues >= credibleIntervalLower &&
                        actualDistinctValues <= credibleIntervalUpper

  // Calculate relative error
  const relativeError = (estimatedSize - actualDistinctValues) / actualDistinctValues

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
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
  console.log('=== Filter Cascade Impact Study ===')
  console.log('Hypothesis: Size estimation accuracy degrades with filter depth\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/filter-cascade.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'chain_depth',
    'filter_pass_rate',
    'composite_pass_rate',
    'estimated_size',
    'actual_distinct_values',
    'credible_interval_lower',
    'credible_interval_upper',
    'true_value_in_ci',
    'relative_error',
    'elapsed_micros'
  ])

  // Study configuration
  const chainDepths = [1, 2, 3, 5]
  const filterPassRates = [0.5, 0.7, 0.9]
  const trialsPerConfig = getSampleSize(200, 50)
  const totalTrials = chainDepths.length * filterPassRates.length * trialsPerConfig

  // Print study parameters
  console.log(`Base arbitrary: integer(0, 999) (size = 1000)`)
  console.log(`Chain depths: ${chainDepths.join(', ')}`)
  console.log(`Filter pass rates: ${filterPassRates.map(r => `${(r*100).toFixed(0)}%`).join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'FilterCascade')

  let trialId = 0
  for (const chainDepth of chainDepths) {
    for (const filterPassRate of filterPassRates) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const result = runTrial(trialId, chainDepth, filterPassRate)

        writer.writeRow([
          result.trialId,
          result.seed,
          result.chainDepth,
          result.filterPassRate.toFixed(2),
          result.compositePassRate.toFixed(4),
          result.estimatedSize,
          result.actualDistinctValues,
          result.credibleIntervalLower,
          result.credibleIntervalUpper,
          result.trueValueInCI,
          result.relativeError.toFixed(6),
          result.elapsedMicros
        ])

        progress.update()
        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Filter cascade study complete`)
  console.log(`  Output: ${outputPath}`)
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
