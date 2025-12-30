/**
 * Credible Interval Calibration Study: Are size estimation CIs correctly calibrated?
 *
 * This study validates the credible interval system for arbitrary size estimation.
 * The system claims 90% credible intervals (significance = 0.90), meaning the true
 * size should fall within the interval ~90% of the time.
 *
 * ## Hypotheses
 *
 * H1 (Filter CI Calibration): For FilteredArbitrary, the 90% CI contains the true
 *     size in 90% ± 5% of trials after sufficient sampling.
 *
 * H2 (Product CI Calibration): When combining CIs via multiplication (tuples/records),
 *     the resulting CI maintains ≥90% coverage (may be conservative/wider).
 *
 * H3 (Sum CI Calibration): When combining CIs via addition (unions),
 *     the resulting CI maintains ≥90% coverage (may be conservative/wider).
 *
 * H4 (Interval Width): Product/Sum CIs are not excessively conservative (coverage ≤99%).
 *
 * ## Method
 *
 * For each scenario:
 * 1. Create arbitrary with known true size
 * 2. Sample to update the Beta posterior (for filters)
 * 3. Get estimated size and CI
 * 4. Compare CI bounds to true size
 * 5. Aggregate coverage rate across trials
 *
 * ## Expected Results
 *
 * - Individual filter CIs: ~90% coverage (if calibrated)
 * - Product CIs: ≥90% coverage (conservative due to interval arithmetic)
 * - Sum CIs: ≥90% coverage (conservative due to interval arithmetic)
 *
 * ## Known Issues
 *
 * Interval arithmetic (multiplying/adding interval bounds) produces conservative
 * estimates because the probability of both variables being at their extreme
 * bounds simultaneously is less than the product of their individual tail
 * probabilities.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

// Target significance level from util.ts
const TARGET_COVERAGE = 0.90

interface CICalibrationResult {
  trialId: number
  seed: number
  scenario: string
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  ciWidth: number
  trueInCI: boolean
  warmupSamples: number
  relativeError: number
}

interface CICalibrationParams {
  scenario: string
  createArbitrary: (seed: number) => {
    arb: fc.Arbitrary<unknown>
    trueSize: number
    warmupCount: number
  }
}

/**
 * Force additional sampling to update the Beta posterior
 */
function warmupArbitrary<T>(arb: fc.Arbitrary<T>, count: number, generator: () => number): void {
  for (let i = 0; i < count; i++) {
    arb.pick(generator)
  }
}

function runTrial(
  params: CICalibrationParams,
  trialId: number,
  indexInConfig: number
): CICalibrationResult {
  const { scenario, createArbitrary } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  // Create the arbitrary
  const { arb, trueSize, warmupCount } = createArbitrary(seed)

  // Warm up to allow Beta posterior to converge
  warmupArbitrary(arb, warmupCount, generator)

  // Get size estimate with CI
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
    ciWidth,
    trueInCI,
    warmupSamples: warmupCount,
    relativeError
  }
}

/**
 * Scenario definitions
 */
function createScenarios(): CICalibrationParams[] {
  const scenarios: CICalibrationParams[] = []

  // ============================================================================
  // Scenario 1: Single Filter (Various Pass Rates)
  // ============================================================================

  for (const passRate of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    scenarios.push({
      scenario: `filter_${(passRate * 100).toFixed(0)}pct`,
      createArbitrary: (seed: number) => {
        const baseSize = 1000
        // Use deterministic modular selection
        const threshold = Math.floor(baseSize * passRate)
        const arb = fc.integer(0, baseSize - 1).filter(x => x < threshold)
        return {
          arb,
          trueSize: threshold,
          warmupCount: 200 // Enough to get good posterior estimate
        }
      }
    })
  }

  // ============================================================================
  // Scenario 2: Product of Exact Sizes (Tuple)
  // ============================================================================

  scenarios.push({
    scenario: 'tuple_exact_2x',
    createArbitrary: () => {
      const arb1 = fc.integer(0, 9) // size 10
      const arb2 = fc.integer(0, 4) // size 5
      const arb = fc.tuple(arb1, arb2)
      return {
        arb,
        trueSize: 50, // 10 * 5
        warmupCount: 0 // Exact sizes, no warmup needed
      }
    }
  })

  scenarios.push({
    scenario: 'tuple_exact_3x',
    createArbitrary: () => {
      const arb1 = fc.integer(0, 4) // size 5
      const arb2 = fc.integer(0, 3) // size 4
      const arb3 = fc.integer(0, 2) // size 3
      const arb = fc.tuple(arb1, arb2, arb3)
      return {
        arb,
        trueSize: 60, // 5 * 4 * 3
        warmupCount: 0
      }
    }
  })

  // ============================================================================
  // Scenario 3: Product with Filtered Arbitrary (CI Propagation)
  // ============================================================================

  for (const passRate of [0.3, 0.5, 0.7]) {
    scenarios.push({
      scenario: `tuple_filtered_${(passRate * 100).toFixed(0)}pct`,
      createArbitrary: () => {
        const baseSize = 100
        const threshold = Math.floor(baseSize * passRate)

        const arb1 = fc.integer(0, baseSize - 1).filter(x => x < threshold) // ~passRate * 100
        const arb2 = fc.integer(0, 4) // size 5 (exact)

        const arb = fc.tuple(arb1, arb2)
        return {
          arb,
          trueSize: threshold * 5, // filtered size * 5
          warmupCount: 200
        }
      }
    })
  }

  // ============================================================================
  // Scenario 4: Sum of Exact Sizes (Union)
  // ============================================================================

  scenarios.push({
    scenario: 'union_exact_2x',
    createArbitrary: () => {
      // Disjoint integer ranges
      const arb1 = fc.integer(0, 9) // size 10
      const arb2 = fc.integer(100, 104) // size 5 (disjoint)
      const arb = fc.union(arb1, arb2)
      return {
        arb,
        trueSize: 15, // 10 + 5
        warmupCount: 0
      }
    }
  })

  scenarios.push({
    scenario: 'union_exact_3x',
    createArbitrary: () => {
      const arb1 = fc.integer(0, 4) // size 5
      const arb2 = fc.integer(100, 103) // size 4
      const arb3 = fc.integer(200, 202) // size 3
      const arb = fc.union(arb1, arb2, arb3)
      return {
        arb,
        trueSize: 12, // 5 + 4 + 3
        warmupCount: 0
      }
    }
  })

  // ============================================================================
  // Scenario 5: Sum with Filtered Arbitrary (CI Propagation)
  // ============================================================================

  for (const passRate of [0.3, 0.5, 0.7]) {
    scenarios.push({
      scenario: `union_filtered_${(passRate * 100).toFixed(0)}pct`,
      createArbitrary: () => {
        const baseSize = 100
        const threshold = Math.floor(baseSize * passRate)

        const arb1 = fc.integer(0, baseSize - 1).filter(x => x < threshold) // ~passRate * 100
        const arb2 = fc.integer(1000, 1009) // size 10 (exact, disjoint)

        const arb = fc.union(arb1, arb2)
        return {
          arb,
          trueSize: threshold + 10, // filtered size + 10
          warmupCount: 200
        }
      }
    })
  }

  // ============================================================================
  // Scenario 6: Chained Filters (Error Accumulation)
  // ============================================================================

  for (const depth of [2, 3]) {
    scenarios.push({
      scenario: `filter_chain_depth${depth}`,
      createArbitrary: (seed: number) => {
        const baseSize = 1000
        const passRate = 0.7 // Each filter passes 70%

        // Build chain of filters
        let arb: fc.Arbitrary<number> = fc.integer(0, baseSize - 1)
        let trueSize = baseSize

        for (let i = 0; i < depth; i++) {
          const layer = i
          // Each filter reduces to ~70% of previous
          arb = arb.filter(x => {
            // Use hash-based deterministic filter
            const h = (x * 2654435761 + layer * 7919) >>> 0
            return (h % 100) < (passRate * 100)
          })
          trueSize = Math.floor(trueSize * passRate)
        }

        return {
          arb,
          trueSize,
          warmupCount: 300 // More warmup for chained filters
        }
      }
    })
  }

  // ============================================================================
  // Scenario 7: Nested Composition (Tuple of Unions, Union of Tuples)
  // ============================================================================

  scenarios.push({
    scenario: 'tuple_of_unions',
    createArbitrary: () => {
      const union1 = fc.union(fc.integer(0, 4), fc.integer(100, 102)) // size 5 + 3 = 8
      const union2 = fc.union(fc.integer(200, 201), fc.integer(300, 303)) // size 2 + 4 = 6
      const arb = fc.tuple(union1, union2)
      return {
        arb,
        trueSize: 48, // 8 * 6
        warmupCount: 0
      }
    }
  })

  scenarios.push({
    scenario: 'union_of_tuples',
    createArbitrary: () => {
      const tuple1 = fc.tuple(fc.integer(0, 2), fc.integer(0, 1)) // size 3 * 2 = 6
      const tuple2 = fc.tuple(fc.integer(100, 103), fc.integer(100, 101)) // size 4 * 2 = 8
      const arb = fc.union(tuple1, tuple2)
      return {
        arb,
        trueSize: 14, // 6 + 8
        warmupCount: 0
      }
    }
  })

  return scenarios
}

async function runCICalibrationStudy(): Promise<void> {
  const scenarios = createScenarios()

  const runner = new ExperimentRunner<CICalibrationParams, CICalibrationResult>({
    name: 'Credible Interval Calibration Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/ci-calibration.csv'),
    csvHeader: [
      'trial_id', 'seed', 'scenario', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'ci_width', 'true_in_ci', 'warmup_samples',
      'relative_error'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: CICalibrationResult) => [
      r.trialId, r.seed, r.scenario, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.ciWidth.toFixed(2),
      r.trueInCI, r.warmupSamples, r.relativeError.toFixed(6)
    ],
    preRunInfo: () => {
      console.log('Hypothesis: 90% credible intervals contain the true size in 90% ± 5% of trials.\n')
      console.log(`Target coverage: ${(TARGET_COVERAGE * 100).toFixed(0)}%`)
      console.log(`Scenarios: ${scenarios.length}`)
      console.log(`Scenario types:`)
      console.log(`  - Single filters (various pass rates)`)
      console.log(`  - Tuple/Record products (exact and with filters)`)
      console.log(`  - Union sums (exact and with filters)`)
      console.log(`  - Filter chains (error accumulation)`)
      console.log(`  - Nested compositions (tuple of unions, union of tuples)`)
    }
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCICalibrationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runCICalibrationStudy }
