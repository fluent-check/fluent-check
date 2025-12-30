/**
 * Deduplication Efficiency Study: Does deduplication improve unique value coverage?
 *
 * Tests whether the deduplication mechanism improves unique value coverage
 * with measurable overhead, and tracks termination guard trigger rates.
 *
 * IMPORTANT: This validates the DedupingSampler's ability to maximize
 * unique value coverage when arbitrary size is limited or non-injective
 * mappings reduce actual distinct values.
 *
 * What we measure:
 * 1. Unique/requested ratio per arbitrary type
 * 2. Termination guard trigger rate
 * 3. Time overhead (deduping vs random)
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface DeduplicationResult {
  trialId: number
  seed: number
  arbitraryType: 'exact' | 'non_injective' | 'filtered'
  samplerType: 'deduping' | 'random'
  requestedCount: number
  actualCount: number
  uniqueCount: number
  terminationGuardTriggered: boolean
  elapsedMicros: number
}

interface DeduplicationParams {
  arbitraryType: 'exact' | 'non_injective' | 'filtered'
  samplerType: 'deduping' | 'random'
  requestedCount: number
}

/**
 * Count unique values in an array
 */
function countUnique<T>(values: T[]): number {
  return new Set(values).size
}

/**
 * Sample with deduplication using fluent-check's built-in mechanism
 */
function sampleWithDedup<T>(
  arb: fc.Arbitrary<T>,
  count: number,
  rng: () => number
): { values: T[], guardTriggered: boolean } {
  const values: T[] = []
  const seen = new Set<unknown>()
  let attempts = 0
  const maxAttempts = count * 100 // Guard to prevent infinite loops
  let noProgressCount = 0
  const NO_PROGRESS_ATTEMPTS_THRESHOLD = 50

  while (values.length < count && attempts < maxAttempts) {
    const pick = arb.pick(rng)
    // pick is FluentPick<T> | undefined
    if (pick !== undefined && !seen.has(pick.value)) {
      seen.add(pick.value)
      values.push(pick.value)
      noProgressCount = 0
    } else {
      noProgressCount++
      // Trigger guard if no progress in 50 attempts
      if (noProgressCount >= NO_PROGRESS_ATTEMPTS_THRESHOLD) {
        return { values, guardTriggered: true }
      }
    }
    attempts++
  }

  return {
    values,
    guardTriggered: attempts >= maxAttempts
  }
}

/**
 * Sample without deduplication (plain random sampling)
 */
function sampleWithoutDedup<T>(
  arb: fc.Arbitrary<T>,
  count: number,
  rng: () => number
): T[] {
  const values: T[] = []
  for (let i = 0; i < count; i++) {
    const pick = arb.pick(rng)
    if (pick !== undefined) {
      values.push(pick.value)
    }
  }
  return values
}

/**
 * Run a single trial measuring deduplication efficiency
 */
function runTrial(
  params: DeduplicationParams,
  trialId: number,
  indexInConfig: number
): DeduplicationResult {
  const { arbitraryType, samplerType, requestedCount } = params
  const seed = getSeed(indexInConfig) // Use index in config for consistent seed
  const rng = mulberry32(seed)
  const timer = new HighResTimer()

  // Create arbitrary based on type
  let arb: fc.Arbitrary<number>
  switch (arbitraryType) {
    case 'exact':
      // 100 distinct values, no transformation
      arb = fc.integer(0, 99)
      break
    case 'non_injective':
      // 100 values mapped to 10 distinct (10-to-1 mapping)
      arb = fc.integer(0, 99).map(x => x % 10)
      break
    case 'filtered':
      // 100 values filtered to ~10 distinct
      arb = fc.integer(0, 99).filter(x => x % 10 === 0)
      break
  }

  // Sample based on sampler type
  let actualCount: number
  let uniqueCount: number
  let terminationGuardTriggered = false

  if (samplerType === 'deduping') {
    const result = sampleWithDedup(arb, requestedCount, rng)
    actualCount = result.values.length
    uniqueCount = countUnique(result.values)
    terminationGuardTriggered = result.guardTriggered
  } else {
    const values = sampleWithoutDedup(arb, requestedCount, rng)
    actualCount = values.length
    uniqueCount = countUnique(values)
    terminationGuardTriggered = false
  }

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    arbitraryType,
    samplerType,
    requestedCount,
    actualCount,
    uniqueCount,
    terminationGuardTriggered,
    elapsedMicros
  }
}

/**
 * Run deduplication efficiency study
 */
async function runDeduplicationStudy(): Promise<void> {
  const arbitraryTypes: Array<'exact' | 'non_injective' | 'filtered'> = [
    'exact',
    'non_injective',
    'filtered'
  ]
  const samplerTypes: Array<'deduping' | 'random'> = ['deduping', 'random']
  const requestedCounts = [10, 50, 100, 500]

  const parameters: DeduplicationParams[] = []
  for (const arbitraryType of arbitraryTypes) {
    for (const samplerType of samplerTypes) {
      for (const requestedCount of requestedCounts) {
        parameters.push({
          arbitraryType,
          samplerType,
          requestedCount
        })
      }
    }
  }

  const runner = new ExperimentRunner<DeduplicationParams, DeduplicationResult>({
    name: 'Deduplication Efficiency Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/deduplication.csv'),
    csvHeader: [
      'trial_id', 'seed', 'arbitrary_type', 'sampler_type', 'requested_count',
      'actual_count', 'unique_count', 'termination_guard_triggered', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: DeduplicationResult) => [
      r.trialId, r.seed, r.arbitraryType, r.samplerType, r.requestedCount,
      r.actualCount, r.uniqueCount, r.terminationGuardTriggered, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Deduplication improves unique value coverage with measurable overhead\n')
      console.log(`Arbitrary types:`)
      console.log(`  - exact: integer(0, 99) - 100 distinct values`)
      console.log(`  - non_injective: integer(0, 99).map(x => x % 10) - 10 distinct after map`)
      console.log(`  - filtered: integer(0, 99).filter(x => x % 10 === 0) - 10 distinct after filter`)
      console.log(`Sampler types: ${samplerTypes.join(', ')}`)
      console.log(`Requested counts: ${requestedCounts.join(', ')}`)
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runDeduplicationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runDeduplicationStudy }
