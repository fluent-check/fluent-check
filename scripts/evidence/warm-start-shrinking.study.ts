/**
 * Study I: Warm Start Shrinking
 *
 * Investigates whether transferring knowledge from parent to child during shrinking
 * (Warm Start) improves CI calibration and efficiency compared to Cold Start.
 *
 * Method:
 * 1. Define FilteredArbitrary with known true size and pass rate.
 * 2. Perform shrinking steps.
 * 3. At each step, measure:
 *    - True size of shrunk space (via exhaustive enumeration for small spaces)
 *    - Estimated size (using Cold Start vs Warm Start)
 *    - CI coverage
 *    - CI width
 * 
 * Configurations:
 * - Warm Start Scale: 0 (Cold), 0.5, 1.0
 * - Scenario: 
 *   - "subset": Shrunk space is strict subset (pass rate increases)
 *   - "scaled": Shrunk space scales proportionally (pass rate constant)
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'
import { FilteredArbitrary } from '../../src/arbitraries/FilteredArbitrary.js'

export interface WarmStartResult {
  trialId: number
  seed: number
  scenario: string
  warmStartScale: number
  shrunkSize: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
  ciWidth: number
  relativeError: number
}

export interface WarmStartParams {
  scenario: 'subset' | 'scaled'
  warmStartScale: number
}

// Access internal WARM_START_SCALE
// We need to cast to any to access static property if it's not strictly public in types yet,
// or just assume it is public. It was defined as public static.
function setWarmStartScale(scale: number) {
  FilteredArbitrary.WARM_START_SCALE = scale
}

function runTrial(
  params: WarmStartParams,
  trialId: number,
  indexInConfig: number
): WarmStartResult {
  const { scenario, warmStartScale } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  // Configure global warm start scale
  setWarmStartScale(warmStartScale)

  let parentArb: fc.Arbitrary<number>
  let shrinkTarget: number
  let predicate: (x: number) => boolean
  let trueSize: number

  // Define scenarios
  if (scenario === 'subset') {
    // Original: 0..100, keep < 50. Pass rate 50%.
    // Shrink target: 25.
    // Shrunk space (Integer shrinks to target-1): 0..24, keep < 50. 
    // True size: 25 (0 to 24 are 25 values, all < 50).
    predicate = (x: number) => x < 50
    parentArb = fc.integer(0, 100).filter(predicate)
    shrinkTarget = 25
    trueSize = 25
  } else {
    // Original: 0..100, keep even. Pass rate 50%.
    // Shrink target: 50.
    // Shrunk space (Integer shrinks to target-1): 0..49, keep even.
    // True size: 25 (0, 2, ..., 48. Count is 25).
    predicate = (x: number) => x % 2 === 0
    parentArb = fc.integer(0, 100).filter(predicate)
    shrinkTarget = 50
    trueSize = 25
  }

  // Pick and Shrink
  // We simulate a shrink by manually invoking shrink on the parent with a constructed pick
  // ensuring we get the specific shrunk arbitrary we want to test.
  
  // Note: We need to make sure we have "learned" something in the parent first!
  // So we must sample from parentArb before shrinking.
  for (let i = 0; i < 50; i++) {
    parentArb.pick(generator)
  }

  const pick = { value: shrinkTarget, original: shrinkTarget }
  // This will call FilteredArbitrary.shrink, which uses WARM_START_SCALE
  const shrunkArb = parentArb.shrink(pick)

  if (shrunkArb === undefined || !shrunkArb.size) {
    throw new Error('Shrunk arbitrary is invalid')
  }

  // Now measure the shrunk arbitrary (which has already been warmed up in its constructor)
  // The question is: does the transfer of alpha/beta help?
  
  const sizeInfo = shrunkArb.size()
  const estimatedSize = sizeInfo.value
  let ciLower = estimatedSize
  let ciUpper = estimatedSize

  if (sizeInfo.type === 'estimated') {
    ciLower = sizeInfo.credibleInterval[0]
    ciUpper = sizeInfo.credibleInterval[1]
  }

  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper
  const ciWidth = ciUpper - ciLower
  const relativeError = Math.abs(estimatedSize - trueSize) / trueSize

  return {
    trialId,
    seed,
    scenario,
    warmStartScale,
    shrunkSize: shrinkTarget, // Just using target as proxy for size category
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI,
    ciWidth,
    relativeError
  }
}

async function runWarmStartStudy(): Promise<void> {
  const scenarios: WarmStartParams[] = []
  
  // Test 3 scales: 0 (Control), 0.5 (Conservative Transfer), 1.0 (Full Transfer)
  const scales = [0, 0.5, 1.0]
  const types = ['subset', 'scaled'] as const

  for (const s of types) {
    for (const scale of scales) {
      scenarios.push({ scenario: s, warmStartScale: scale })
    }
  }

  const runner = new ExperimentRunner<WarmStartParams, WarmStartResult>({
    name: 'Study I: Warm Start Shrinking',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/warm-start-shrinking.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'warm_start_scale', 'shrunk_size',
      'true_size', 'estimated_size', 'ci_lower', 'ci_upper', 
      'true_in_ci', 'ci_width', 'relative_error'
    ],
    trialsPerConfig: getSampleSize(500, 50),
    resultToRow: (r: WarmStartResult) => [
      r.trialId, r.seed, r.scenario, r.warmStartScale, r.shrunkSize,
      r.trueSize, r.estimatedSize, r.ciLower, r.ciUpper,
      r.trueInCI, r.ciWidth, r.relativeError.toFixed(4)
    ],
    preRunInfo: () => {
      console.log('Hypothesis: Warm start (scale > 0) improves precision without sacrificing coverage')
      console.log('Scales: 0 (Cold), 0.5 (Half), 1.0 (Full)')
    }
  })

  try {
    await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
  } finally {
    // Reset to default
    setWarmStartScale(0)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWarmStartStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runWarmStartStudy }
