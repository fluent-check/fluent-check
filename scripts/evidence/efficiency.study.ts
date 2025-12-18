/**
 * Efficiency Study: Does confidence-based termination adapt to property complexity?
 * 
 * Tests whether the system terminates differently based on property characteristics.
 * 
 * IMPORTANT CONSTRAINT: FluentCheck checks confidence every 100 tests (confidenceCheckInterval).
 * This means the MINIMUM termination point for confidence is 100 tests.
 * 
 * Property types tested:
 * - always_true: 100% pass rate → should terminate at first confidence check (100 tests)
 * - rare_failure (0.1%): 99.9% pass rate → usually achieves confidence, sometimes finds bug
 * - common_failure (1%): 99% pass rate → often finds bug before confidence
 * - frequent_failure (5%): 95% pass rate → almost always finds bug
 * 
 * Key metric: Distribution of tests_run shows how property complexity affects termination.
 */

import * as fc from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface EfficiencyResult {
  trialId: number
  seed: number
  testsRun: number
  bugFound: boolean
  claimedConfidence: number
  propertyType: string
  truePassRate: number
  targetConfidence: number
  passRateThreshold: number
  terminationReason: string
  elapsedMicros: number
}

/**
 * Run a single efficiency trial with configurable pass rate
 */
function runTrial(
  trialId: number,
  propertyType: string,
  failureRate: number,
  targetConfidence: number,
  passRateThreshold: number
): EfficiencyResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  // Compute fail frequency from failure rate
  // 0 failure rate means always true
  // 0.001 = 1 in 1000, 0.01 = 1 in 100, etc.
  const failAt = failureRate > 0 ? Math.floor(1 / failureRate) : 0

  const result = fc.scenario()
    .config(fc.strategy()
      .withConfidence(targetConfidence)
      .withPassRateThreshold(passRateThreshold)
      .withMaxIterations(10000)
      .withRandomGenerator(mulberry32, seed))
    .forall('x', fc.integer(1, 100000))
    .then(({ x }) => failAt === 0 || x % failAt !== 0) // Always true if failAt=0
    .check()

  const elapsedMicros = timer.elapsedMicros()

  // Determine termination reason
  let terminationReason: string
  if (!result.satisfiable) {
    terminationReason = 'bugFound'
  } else if (result.statistics.confidence && result.statistics.confidence >= targetConfidence) {
    terminationReason = 'confidence'
  } else {
    terminationReason = 'maxIterations'
  }

  return {
    trialId,
    seed,
    testsRun: result.statistics.testsRun,
    bugFound: !result.satisfiable,
    claimedConfidence: result.statistics.confidence ?? 0,
    propertyType,
    truePassRate: 1 - failureRate,
    targetConfidence,
    passRateThreshold,
    terminationReason,
    elapsedMicros
  }
}

/**
 * Run efficiency study
 */
async function runEfficiencyStudy(): Promise<void> {
  console.log('\n=== Efficiency Study ===')
  console.log('Hypothesis: Confidence-based termination adapts to property complexity\n')
  console.log('Note: Confidence checked every 100 tests (minimum termination point)\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/efficiency.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'tests_run',
    'bug_found',
    'claimed_confidence',
    'property_type',
    'true_pass_rate',
    'target_confidence',
    'pass_rate_threshold',
    'termination_reason',
    'elapsed_micros'
  ])

  // Study parameters
  // Using threshold of 0.80 to easily achieve confidence for high pass-rate properties
  const targetConfidence = 0.95
  const passRateThreshold = 0.80
  
  // Property configurations - wider range to show adaptation
  const properties = [
    { name: 'always_true', failureRate: 0 },           // 100% pass rate - terminates at ~100
    { name: 'rare_failure', failureRate: 0.001 },      // 99.9% pass rate (1 in 1000)
    { name: 'uncommon_failure', failureRate: 0.005 },  // 99.5% pass rate (1 in 200)
    { name: 'common_failure', failureRate: 0.01 },     // 99% pass rate (1 in 100)
    { name: 'frequent_failure', failureRate: 0.05 }    // 95% pass rate (1 in 20)
  ]

  const trialsPerProperty = getSampleSize(200, 50)
  const totalTrials = properties.length * trialsPerProperty

  console.log(`Target confidence: ${targetConfidence}`)
  console.log(`Pass rate threshold: ${passRateThreshold} (asking "is pass rate > 80%?")`)
  console.log(`\nProperty types:`)
  for (const p of properties) {
    const expected = p.failureRate === 0 
      ? 'terminates at 100 (first check)'
      : `~${Math.round(1/p.failureRate)} tests to first failure on average`
    console.log(`  - ${p.name}: ${((1 - p.failureRate) * 100).toFixed(1)}% pass rate (${expected})`)
  }
  console.log(`\nTrials per property: ${trialsPerProperty}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'Efficiency')

  let trialId = 0
  for (const prop of properties) {
    for (let i = 0; i < trialsPerProperty; i++) {
      const result = runTrial(
        trialId,
        prop.name,
        prop.failureRate,
        targetConfidence,
        passRateThreshold
      )

      writer.writeRow([
        result.trialId,
        result.seed,
        result.testsRun,
        result.bugFound,
        result.claimedConfidence.toFixed(6),
        result.propertyType,
        result.truePassRate.toFixed(4),
        result.targetConfidence,
        result.passRateThreshold,
        result.terminationReason,
        result.elapsedMicros
      ])

      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Efficiency study complete`)
  console.log(`  Output: ${outputPath}`)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEfficiencyStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runEfficiencyStudy }
