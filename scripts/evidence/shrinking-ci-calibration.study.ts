/**
 * Study E: Shrinking CI Calibration
 *
 * Does calibration hold for shrunk filtered arbitraries?
 *
 * Background:
 * When test fails, FluentCheck shrinks by calling arbitrary.shrink(failingValue).
 * For FilteredArbitrary, this creates new FilteredArbitrary with reduced search space.
 * Size estimation starts COLD (no prior information from parent).
 *
 * Cold-Start Problem:
 * - Parent may have sampled 1000s of values (well-calibrated)
 * - Shrunk child starts with Beta(2,1) prior (no warmup transferred)
 * - If shrunk space is small, warmup may be insufficient
 *
 * Hypotheses:
 * E1: Coverage ≥90% when shrunk space has same pass rate as parent
 * E2: Coverage ≥85% when shrunk space has higher pass rate (subset of passing values)
 * E3: Warmup sensitivity: Coverage improves with additional warmup samples
 *
 * Scenarios:
 * 1. Same Pass Rate: Parent 50%, Shrunk 50%
 * 2. Higher Pass Rate (Subset): Parent 50%, Shrunk 100% (all values in shrunk space pass)
 * 3. Warmup Sensitivity: Test with {0, 10, 50, 100} additional warmup samples
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface ShrinkingCIResult {
  trialId: number
  seed: number
  scenario: string
  warmupCount: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
  relativeError: number
}

interface ShrinkingCIParams {
  scenario: string
  warmupCount: number
  parentBaseSize: number
  shrunkBaseSize: number
  parentPredicate: (x: number) => boolean
  shrunkPredicate: (x: number) => boolean
  getTrueSize: (baseSize: number) => number
}

function runTrial(
  params: ShrinkingCIParams,
  trialId: number,
  indexInConfig: number
): ShrinkingCIResult {
  const { scenario, warmupCount, shrunkBaseSize, shrunkPredicate, getTrueSize } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const trueSize = getTrueSize(shrunkBaseSize)

  // Create shrunk FilteredArbitrary (cold start - no parent information transferred)
  const shrunkArb = fc.integer(0, shrunkBaseSize - 1).filter(shrunkPredicate)

  // Apply warmup samples
  for (let i = 0; i < warmupCount; i++) {
    shrunkArb.pick(generator)
  }

  const sizeInfo = shrunkArb.size()
  const estimatedSize = sizeInfo.value

  let ciLower = estimatedSize
  let ciUpper = estimatedSize

  if (sizeInfo.type === 'estimated') {
    ciLower = sizeInfo.credibleInterval[0]
    ciUpper = sizeInfo.credibleInterval[1]
  }

  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper
  const relativeError = trueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - trueSize) / trueSize

  return {
    trialId,
    seed,
    scenario,
    warmupCount,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI,
    relativeError
  }
}

async function runShrinkingCIStudy(): Promise<void> {
  const warmupCounts = [0, 10, 50, 100]

  const scenarios: ShrinkingCIParams[] = []

  // E1: Same Pass Rate (50% -> 50%)
  for (const warmup of warmupCounts) {
    scenarios.push({
      scenario: 'same_pass_rate_50pct',
      warmupCount: warmup,
      parentBaseSize: 1000,
      shrunkBaseSize: 500,
      parentPredicate: (x: number) => x % 2 === 0, // Even numbers (50%)
      shrunkPredicate: (x: number) => x % 2 === 0, // Still even (50%)
      getTrueSize: (bs: number) => Math.floor(bs / 2) // 250
    })
  }

  // E2: Higher Pass Rate - Subset (50% -> 100%)
  for (const warmup of warmupCounts) {
    scenarios.push({
      scenario: 'subset_higher_pass_rate',
      warmupCount: warmup,
      parentBaseSize: 1000,
      shrunkBaseSize: 200,
      parentPredicate: (x: number) => x < 500, // First 500 values (50%)
      shrunkPredicate: (x: number) => x < 500, // All shrunk values < 200 pass (100%)
      getTrueSize: (bs: number) => bs // All 200 values pass
    })
  }

  const runner = new ExperimentRunner<ShrinkingCIParams, ShrinkingCIResult>({
    name: 'Shrinking CI Calibration Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/shrinking-ci-calibration.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'warmup_count', 'true_size',
      'estimated_size', 'ci_lower', 'ci_upper', 'true_in_ci', 'relative_error'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: ShrinkingCIResult) => [
      r.trialId, r.seed, r.scenario, r.warmupCount, r.trueSize,
      r.estimatedSize, r.ciLower.toFixed(2), r.ciUpper.toFixed(2),
      r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runShrinkingCIStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runShrinkingCIStudy }
