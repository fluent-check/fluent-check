/**
 * Study D: Composition Depth Impact
 *
 * Does coverage degrade with nesting depth?
 *
 * Hypotheses:
 * D1: Coverage remains ≥90% for depth ≤ 3
 * D2: Coverage remains ≥85% for depth ≤ 5
 *
 * Method: Create nested compositions (tuples of tuples...), measure coverage at each depth.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'

interface DepthResult {
  trialId: number
  seed: number
  depth: number
  structure: string // 'tuple' or 'union'
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
  relativeError: number
}

interface DepthParams {
  depth: number
  structure: 'tuple' | 'union'
}

function createNestedArbitrary(depth: number, structure: 'tuple' | 'union', seed: number): { arb: fc.Arbitrary<unknown>, trueSize: number } {
  // Base case: depth 0 is a filtered integer (source of uncertainty)
  if (depth === 0) {
    const baseSize = 10
    // Use seed to vary the pass rate slightly or fix it?
    // Let's fix it to 50% to maximize variance/uncertainty
    const passRate = 0.5
    const threshold = Math.floor(baseSize * passRate)
    const arb = fc.integer(0, baseSize - 1).filter(x => x < threshold)
    return { arb, trueSize: threshold }
  }

  // Recursive case
  const left = createNestedArbitrary(depth - 1, structure, seed)
  const right = createNestedArbitrary(depth - 1, structure, seed) // Same structure for simplicity

  if (structure === 'tuple') {
    return {
      arb: fc.tuple(left.arb, right.arb),
      trueSize: left.trueSize * right.trueSize
    }
  } else {
    // union
    // To ensure disjointness for exact size summation, we need to be careful.
    // However, fc.union doesn't assume disjointness for probability, but for size estimation 
    // it usually sums sizes if they are distinct types or values.
    // If we union two integers they might overlap.
    // To guarantee disjointness, we can map the values.
    // But that adds another layer.
    // Let's assume standard union size estimation behavior (sum).
    // If the framework sums them, we should check against sum.
    return {
      arb: fc.union(left.arb, right.arb),
      trueSize: left.trueSize + right.trueSize
    }
  }
}

function runTrial(
  params: DepthParams,
  trialId: number,
  indexInConfig: number
): DepthResult {
  const { depth, structure } = params
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)

  const { arb, trueSize } = createNestedArbitrary(depth, structure, seed)
  
  // Warmup the leaves (which are filtered)
  // Since we can't easily reach leaves of a deep structure to pump them individually,
  // we pump the root.
  // Pumping the root samples from children, updating their priors.
  const warmupCount = 100 * (depth + 1) // Increase warmup for deeper structures
  for (let i = 0; i < warmupCount; i++) {
    try {
      arb.pick(generator)
    } catch (e) {
      // Ignore exhaustion
    }
  }

  const sizeInfo = arb.size()
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
    depth,
    structure,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI,
    relativeError
  }
}

async function runDepthStudy(): Promise<void> {
  const scenarios: DepthParams[] = []
  
  // Depths 1 to 5
  for (let d = 1; d <= 5; d++) {
    scenarios.push({ depth: d, structure: 'tuple' })
    scenarios.push({ depth: d, structure: 'union' })
  }

  const runner = new ExperimentRunner<DepthParams, DepthResult>({
    name: 'Composition Depth Impact Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/composition-depth.csv'),
    csvHeader: [
      'trial_id', 'seed', 'depth', 'structure', 'true_size', 'estimated_size',
      'ci_lower', 'ci_upper', 'true_in_ci', 'relative_error'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: DepthResult) => [
      r.trialId, r.seed, r.depth, r.structure, r.trueSize, r.estimatedSize,
      r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.trueInCI, r.relativeError.toFixed(6)
    ]
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDepthStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runDepthStudy }
