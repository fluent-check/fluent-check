/**
 * Weighted Union Probability Study: Does ArbitraryComposite sample proportionally to size?
 *
 * Tests whether union arbitraries (ArbitraryComposite) select each branch with
 * probability proportional to its size, as claimed in the implementation.
 *
 * IMPORTANT: ArbitraryComposite uses size-weighted random selection. This study
 * validates that empirical selection frequencies match theoretical proportions.
 *
 * What we measure:
 * 1. Empirical frequency of selecting each branch
 * 2. Chi-squared goodness-of-fit against expected proportions
 * 3. Deviation from theoretical probabilities
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

interface WeightedUnionResult {
  trialId: number
  seed: number
  unionType: string
  branchSizes: string  // JSON array [size1, size2]
  branch0Count: number
  branch1Count: number
  samplesPerTrial: number
  expectedP0: number
  elapsedMicros: number
}

interface WeightedUnionParams {
  name: string
  arb0: fc.Arbitrary<any>
  arb1: fc.Arbitrary<any>
  samplesPerTrial: number
}

/**
 * Run a single trial sampling from a union and counting branch selection
 */
function runTrial(
  params: WeightedUnionParams,
  trialId: number,
  indexInConfig: number
): WeightedUnionResult {
  const { name, arb0, arb1, samplesPerTrial } = params
  const seed = getSeed(indexInConfig) // Use index in config for consistent seed
  const timer = new HighResTimer()
  const generator = mulberry32(seed)

  // Create union
  const union = fc.union(arb0, arb1)

  // Get sizes
  const size0 = arb0.size().value
  const size1 = arb1.size().value
  const totalSize = size0 + size1
  const expectedP0 = size0 / totalSize

  // Sample many times and track which branch was selected
  // We determine the branch by checking canGenerate
  let branch0Count = 0
  let branch1Count = 0

  for (let i = 0; i < samplesPerTrial; i++) {
    const pick = union.pick(generator)

    // Determine which branch this came from
    // Check arb0 first - if it can generate this value, attribute to branch 0
    // This works because we use disjoint arbitraries
    if (arb0.canGenerate(pick)) {
      branch0Count++
    } else {
      branch1Count++
    }
  }

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    unionType: name,
    branchSizes: JSON.stringify([size0, size1]),
    branch0Count,
    branch1Count,
    samplesPerTrial,
    expectedP0,
    elapsedMicros
  }
}

/**
 * Run weighted union probability study
 */
async function runWeightedUnionStudy(): Promise<void> {
  const unionScenarios = [
    {
      name: 'exact_11_vs_2',
      arb0: fc.integer(0, 10),     // size = 11
      arb1: fc.integer(11, 12),    // size = 2 (disjoint range)
    },
    {
      name: 'exact_100_vs_10',
      arb0: fc.integer(0, 99),      // size = 100
      arb1: fc.integer(100, 109),   // size = 10 (disjoint range)
    },
    {
      name: 'exact_50_vs_50',
      arb0: fc.integer(0, 49),      // size = 50
      arb1: fc.integer(50, 99),     // size = 50 (disjoint range)
    },
    {
      name: 'exact_1_vs_99',
      arb0: fc.constant(0),         // size = 1
      arb1: fc.integer(1, 99),      // size = 99 (disjoint range)
    }
  ]

  const samplesPerTrial = 10000  // Enough for stable frequency estimates
  
  const parameters: WeightedUnionParams[] = unionScenarios.map(s => ({
    name: s.name,
    arb0: s.arb0,
    arb1: s.arb1,
    samplesPerTrial
  }))

  const runner = new ExperimentRunner<WeightedUnionParams, WeightedUnionResult>({
    name: 'Weighted Union Probability Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/weighted-union.csv'),
    csvHeader: [
      'trial_id', 'seed', 'union_type', 'branch_sizes', 'branch0_count',
      'branch1_count', 'samples_per_trial', 'expected_p0', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(100, 20),
    resultToRow: (r: WeightedUnionResult) => [
      r.trialId, r.seed, r.unionType, r.branchSizes, r.branch0Count,
      r.branch1Count, r.samplesPerTrial, r.expectedP0.toFixed(6), r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Hypothesis: ArbitraryComposite samples each branch proportionally to its size\n')
      console.log(`Samples per trial: ${samplesPerTrial}`)
      console.log('Union scenarios (homogeneous integer types):')
      for (const scenario of unionScenarios) {
        const size0 = scenario.arb0.size().value
        const size1 = scenario.arb1.size().value
        const expectedP0 = size0 / (size0 + size1)
        console.log(`  - ${scenario.name}: sizes [${size0}, ${size1}], expected P(branch0) = ${expectedP0.toFixed(3)}`)
      }
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeightedUnionStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runWeightedUnionStudy }
