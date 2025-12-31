/**
 * Study F: Chaining (flatMap) CI Validation
 *
 * Does size estimation propagate correctly through ChainedArbitrary (flatMap)?
 *
 * Background:
 * ChainedArbitrary implements dependent composition via flatMap:
 * Pick value from base arbitrary, use it to select second arbitrary.
 *
 * Current Implementation (src/arbitraries/ChainedArbitrary.ts:9):
 * ```typescript
 * override size() { return this.baseArbitrary.size() }
 * ```
 * This returns ONLY base size, ignoring chained arbitrary's size!
 *
 * This may cause:
 * - Weighted union selection bias
 * - Search space under-estimation
 * - Incorrect early termination
 *
 * Hypotheses:
 * F1: Current implementation maintains coverage ≥90% (may be conservative)
 * F2: Width is not excessively large (≤3× optimal)
 * F3: True Bayesian propagation improves precision by ≥30%
 *
 * Scenarios:
 * 1. Independent chain (size = base_size × chain_size)
 * 2. Dependent chain with variable size
 * 3. Filtered chain
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface ChainedCIResult {
  trialId: number
  seed: number
  scenario: string
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
  relativeError: number
  ciWidth: number
}

interface ChainedCIParams {
  scenario: string
  createArbitrary: () => fc.Arbitrary<any>
  trueSize: number
}

function runTrial(
  params: ChainedCIParams,
  trialId: number,
  indexInConfig: number
): ChainedCIResult {
  const { scenario, createArbitrary, trueSize } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const arb = createArbitrary()

  // Warmup
  const warmupCount = 200
  for (let i = 0; i < warmupCount; i++) {
    arb.pick(generator)
  }

  const sizeInfo = arb.size()
  const estimatedSize = sizeInfo.value

  let ciLower = estimatedSize
  let ciUpper = estimatedSize

  if (sizeInfo.type === 'estimated') {
    ciLower = sizeInfo.credibleInterval[0]
    ciUpper = sizeInfo.credibleInterval[1]
  }

  const ciWidth = ciUpper - ciLower
  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper
  const relativeError = trueSize === 0
    ? (estimatedSize === 0 ? 0 : 1.0)
    : Math.abs(estimatedSize - trueSize) / trueSize

  return {
    trialId,
    seed,
    scenario,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI,
    relativeError,
    ciWidth
  }
}

async function runChainedCIStudy(): Promise<void> {
  const scenarios: ChainedCIParams[] = [
    // F1: Independent chain (size = base_size × chain_size)
    {
      scenario: 'independent_chain',
      createArbitrary: () => fc.integer(0, 9).chain(() => fc.integer(0, 99)),
      trueSize: 10 * 100 // 1000
    },

    // F2: Simple dependent chain (constant size regardless of base value)
    {
      scenario: 'dependent_constant',
      createArbitrary: () => fc.integer(1, 10).chain(n => fc.array(fc.integer(0, 9), { length: 1 })),
      trueSize: 10 * 10 // Each of 10 base values maps to 10 arrays
    },

    // F3: Filtered chain (chained arbitrary is filtered)
    {
      scenario: 'filtered_chain',
      createArbitrary: () =>
        fc.integer(0, 9).chain(n => fc.integer(0, 99).filter(x => x < (n + 1) * 10)),
      // True size: Σ(n=0 to 9) min((n+1)*10, 100)
      // = 10 + 20 + 30 + 40 + 50 + 60 + 70 + 80 + 90 + 100 = 550
      trueSize: 550
    },

    // F4: Simple chain with exact count
    {
      scenario: 'simple_chain',
      createArbitrary: () => fc.integer(0, 4).chain(n => fc.constant(n)),
      trueSize: 5 // Maps each of 5 values to itself
    }
  ]

  const runner = new ExperimentRunner<ChainedCIParams, ChainedCIResult>({
    name: 'Chained Arbitrary CI Validation Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/chained-ci-validation.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'true_in_ci', 'relative_error', 'ci_width'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: ChainedCIResult) => [
      r.trialId, r.seed, r.scenario, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.trueInCI,
      r.relativeError.toFixed(6), r.ciWidth.toFixed(2)
    ]
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runChainedCIStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runChainedCIStudy }
