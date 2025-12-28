/**
 * Corner Case Coverage Study: What percentage of bugs are found via corner cases?
 *
 * Compares bug detection across three sampling modes:
 * - Corner cases only (first N corner cases)
 * - Random sampling only
 * - Hybrid (corner cases + random, as in BiasedSampler)
 *
 * IMPORTANT: This tests the core claim that corner cases catch a significant
 * portion of bugs, validating fluent-check's design decision to prioritize them.
 *
 * What we measure:
 * 1. Detection rate per bug type × sampling mode
 * 2. Attribution: In hybrid mode, was bug found via corner case or random sample?
 * 3. Coverage: What percentage of boundary bugs are caught by corner cases alone?
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface CornerCaseCoverageResult {
  trialId: number
  seed: number
  bugType: 'zero_boundary' | 'empty_boundary' | 'off_by_one' | 'interior'
  samplingMode: 'corner_only' | 'random_only' | 'hybrid'
  bugDetected: boolean
  detectedByCornerCase: boolean | null  // null if not detected, or if not hybrid mode
  testsRun: number
  cornerCasesUsed: number
  elapsedMicros: number
}

interface CornerCaseCoverageParams {
  bugType: 'zero_boundary' | 'empty_boundary' | 'off_by_one' | 'interior'
  samplingMode: 'corner_only' | 'random_only' | 'hybrid'
  maxTests: number
}

/**
 * Run a single trial testing corner case coverage
 */
function runTrial(
  params: CornerCaseCoverageParams,
  trialId: number,
  indexInConfig: number
): CornerCaseCoverageResult {
  const { bugType, samplingMode, maxTests } = params
  const seed = getSeed(indexInConfig) // Use index in config for consistent seed
  const timer = new HighResTimer()
  const generator = mulberry32(seed)

  // Define bug predicates - different boundary conditions
  const bugPredicates: Record<string, (x: number) => boolean> = {
    zero_boundary: (x: number) => x !== 0,                  // Fails at zero (common boundary)
    empty_boundary: (x: number) => x !== 0 && x !== 100,  // Fails at both edges
    off_by_one: (x: number) => x !== 1 && x !== 99,       // Off-by-one errors (not in default corners)
    interior: (x: number) => x !== 50              // Interior value (not a boundary)
  }

  const predicate = bugPredicates[bugType]
  const arbitrary = fc.integer(0, 100)
  const cornerCases = arbitrary.cornerCases()

  let bugDetected = false
  let detectedByCornerCase: boolean | null = null
  let testsRun = 0
  let cornerCasesUsed = 0

  if (samplingMode === 'corner_only') {
    // Test only corner cases
    cornerCasesUsed = Math.min(cornerCases.length, maxTests)
    for (let i = 0; i < cornerCasesUsed; i++) {
      testsRun++
      if (!predicate(cornerCases[i].value)) {
        bugDetected = true
        break
      }
    }
    detectedByCornerCase = null  // Not applicable
  } else if (samplingMode === 'random_only') {
    // Test only random samples
    for (let i = 0; i < maxTests; i++) {
      testsRun++
      const pick = arbitrary.pick(generator)
      if (!predicate(pick.value)) {
        bugDetected = true
        break
      }
    }
    detectedByCornerCase = null  // Not applicable
  } else {
    // Hybrid: corner cases first, then random
    cornerCasesUsed = cornerCases.length

    // Test corner cases first
    for (let i = 0; i < cornerCases.length && testsRun < maxTests; i++) {
      testsRun++
      if (!predicate(cornerCases[i].value)) {
        bugDetected = true
        detectedByCornerCase = true
        break
      }
    }

    // If not found and budget remains, test random samples
    if (!bugDetected) {
      const remainingBudget = maxTests - testsRun
      for (let i = 0; i < remainingBudget; i++) {
        testsRun++
        const pick = arbitrary.pick(generator)
        if (!predicate(pick.value)) {
          bugDetected = true
          detectedByCornerCase = false
          break
        }
      }
    }
  }

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    bugType,
    samplingMode,
    bugDetected,
    detectedByCornerCase,
    testsRun,
    cornerCasesUsed,
    elapsedMicros
  }
}

/**
 * Run corner case coverage study
 */
async function runCornerCaseCoverageStudy(): Promise<void> {
  const bugTypes: Array<'zero_boundary' | 'empty_boundary' | 'off_by_one' | 'interior'> = [
    'zero_boundary',
    'empty_boundary',
    'off_by_one',
    'interior'
  ]
  const samplingModes: Array<'corner_only' | 'random_only' | 'hybrid'> = [
    'corner_only',
    'random_only',
    'hybrid'
  ]
  const maxTests = 100

  const parameters: CornerCaseCoverageParams[] = []
  for (const bugType of bugTypes) {
    for (const samplingMode of samplingModes) {
      parameters.push({
        bugType,
        samplingMode,
        maxTests
      })
    }
  }

  const runner = new ExperimentRunner<CornerCaseCoverageParams, CornerCaseCoverageResult>({
    name: 'Corner Case Coverage Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/corner-case-coverage.csv'),
    csvHeader: [
      'trial_id', 'seed', 'bug_type', 'sampling_mode', 'bug_detected',
      'detected_by_corner_case', 'tests_run', 'corner_cases_used', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: CornerCaseCoverageResult) => [
      r.trialId, r.seed, r.bugType, r.samplingMode, r.bugDetected,
      r.detectedByCornerCase, r.testsRun, r.cornerCasesUsed, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: >50% of boundary bugs are found via corner cases alone\n')
      console.log(`Max tests per trial: ${maxTests}`)
      console.log('Bug types:')
      console.log('  - zero_boundary: Fails at x=0 (boundary)')
      console.log('  - empty_boundary: Fails at x=0 and x=100 (both edges)')
      console.log('  - off_by_one: Fails at x=1 and x=99 (near edges)')
      console.log('  - interior: Fails at x=50 (not a boundary)')
      console.log('Sampling modes:')
      console.log('  - corner_only: Test only corner cases')
      console.log('  - random_only: Test only random samples')
      console.log('  - hybrid: Corner cases first, then random')
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runCornerCaseCoverageStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runCornerCaseCoverageStudy }
