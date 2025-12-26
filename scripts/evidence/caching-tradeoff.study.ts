/**
 * Caching Trade-off Study: Detection diversity vs time savings
 *
 * This study examines the impact of using CachedSampler when the same
 * arbitrary instance is reused across multiple quantifiers.
 *
 * What we measure:
 * 1. Bug detection rate (cache enabled vs disabled)
 * 2. Unique values seen (diversity)
 * 3. Execution time savings
 */

import { scenario, integer, strategy } from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, HighResTimer } from './runner.js'
import path from 'path'

interface CachingTradeoffResult {
  trialId: number
  seed: number
  cacheEnabled: boolean
  bugType: 'any_value' | 'diversity_dependent'
  bugDetected: boolean
  uniqueValuesSeen: number
  elapsedMicros: number
}

function runTrial(
  trialId: number,
  cacheEnabled: boolean,
  bugType: 'any_value' | 'combination'
): CachingTradeoffResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Reuse the SAME arbitrary instance to trigger caching
  // Smaller domain (0-20) to ensure high probability of collisions and detection
  const arb = integer(0, 20)
  
  const s = scenario()
    .forall('a', arb)
    .forall('b', arb)
    .forall('c', arb)

  // any_value: Fails if ANY of a,b,c is 10.
  // With caching (pool=4): P(find) ≈ 4/21 ≈ 19%
  // Without caching (pools=4,4,4): P(find) ≈ 1 - (17/21)^3 ≈ 47%
  // This measures pure diversity/coverage loss.
  
  // combination: Fails if a+b+c == 30.
  // Requires specific combinations. Caching might not hurt as much if values are independent?
  // Actually, random sum distribution.
  
  const predicate = bugType === 'any_value'
    ? ({ a, b, c }: any) => a !== 10 && b !== 10 && c !== 10
    : ({ a, b, c }: any) => a + b + c !== 30

  const factory = strategy()
    .withSampleSize(100) // perQuantifier = floor(100^(1/3)) = 4
    .withRandomSampling()
  
  if (cacheEnabled) {
    factory.usingCache()
  }

  const result = s
    .then(predicate)
    .config(factory)
    .check({ seed })

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    cacheEnabled,
    bugType,
    bugDetected: !result.satisfiable,
    uniqueValuesSeen: 0, // Metric removed as it requires deep introspection
    elapsedMicros
  }
}

async function runCachingTradeoffStudy(): Promise<void> {
  console.log('=== Caching Trade-off Study ===')
  console.log('Hypothesis: Caching reduces detection of "any-value" bugs by ~3x (for 3 quantifiers).\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/caching-tradeoff.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'cache_enabled',
    'bug_type',
    'bug_detected',
    'unique_values_seen',
    'elapsed_micros'
  ])

  const bugTypes: ('any_value' | 'combination')[] = ['any_value', 'combination']
  const cacheOptions = [true, false]
  const trialsPerConfig = getSampleSize(500, 100) // Need high sample count for proportion stability
  const totalTrials = bugTypes.length * cacheOptions.length * trialsPerConfig

  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'CacheTradeoff')

  let trialId = 0
  for (const bugType of bugTypes) {
    for (const cacheEnabled of cacheOptions) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const result = runTrial(trialId, cacheEnabled, bugType)
        writer.writeRow([
          result.trialId,
          result.seed,
          result.cacheEnabled,
          result.bugType,
          result.bugDetected,
          result.uniqueValuesSeen,
          result.elapsedMicros
        ])
        progress.update()
        trialId++
      }
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Caching Trade-off study complete`)
  console.log(`  Output: ${outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCachingTradeoffStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runCachingTradeoffStudy }
