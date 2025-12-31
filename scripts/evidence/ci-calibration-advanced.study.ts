/**
 * Advanced Credible Interval Calibration Study: Deep dive into filter chain degradation.
 *
 * This study focuses specifically on the observed degradation in calibration
 * for chained filters (depth 2+), investigating the impact of:
 * 1. Chain depth (1 to 15)
 * 2. Warmup sample count (100 to 1000)
 * 3. Base pass rate (0.1 to 0.9)
 *
 * It uses exact ground truth counting to eliminate estimation errors in the
 * verification process itself.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
import path from 'path'
import { fileURLToPath } from 'url'

export interface AdvancedCICalibrationResult {
  trialId: number
  seed: number
  depth: number
  warmup: number
  passRate: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  trueInCI: boolean
}

export interface AdvancedCICalibrationParams {
  depth: number
  warmup: number
  passRate: number
}

const hash32 = (value: number, seed: number): number => {
  let h = seed | 0;
  let k = value | 0;
  k = Math.imul(k, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  h = Math.imul(h, 5) + 0xe6546b64;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const isSelected = (value: number, layer: number, rate: number): boolean => {
  const h = hash32(value, layer);
  const prob = h / 4294967296;
  return prob < rate;
}

function getArbitraryForScenario(params: AdvancedCICalibrationParams) {
  const { depth, passRate } = params
  const baseSize = 1000
  
  let arb: fc.Arbitrary<number> = fc.integer(0, baseSize - 1)
  for (let i = 0; i < depth; i++) {
    const layer = i
    arb = arb.filter(x => isSelected(x, layer, passRate))
  }

  // Calculate EXACT ground truth
  let trueSize = 0
  for (let x = 0; x < baseSize; x++) {
    let passed = true
    for (let i = 0; i < depth; i++) {
      if (!isSelected(x, i, passRate)) {
        passed = false
        break
      }
    }
    if (passed) trueSize++
  }

  return { arb, trueSize }
}

export function runTrial(
  params: AdvancedCICalibrationParams,
  trialId: number,
  indexInConfig: number
): AdvancedCICalibrationResult {
  const seed = getSeed(indexInConfig)
  const generator = mulberry32(seed)
  const { depth, warmup, passRate } = params

  const { arb, trueSize } = getArbitraryForScenario(params)

  // Warm up
  for (let i = 0; i < warmup; i++) {
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

  const trueInCI = trueSize >= ciLower && trueSize <= ciUpper

  return {
    trialId,
    seed,
    depth,
    warmup,
    passRate,
    trueSize,
    estimatedSize,
    ciLower,
    ciUpper,
    trueInCI
  }
}

async function runAdvancedStudy(): Promise<void> {
  const depths = [1, 2, 3, 5, 10]
  const warmups = [200, 500, 1000]
  const passRates = [0.3, 0.7]

  const scenarios: AdvancedCICalibrationParams[] = []
  for (const depth of depths) {
    for (const warmup of warmups) {
      for (const passRate of passRates) {
        scenarios.push({ depth, warmup, passRate })
      }
    }
  }

  const runner = new ExperimentRunner<AdvancedCICalibrationParams, AdvancedCICalibrationResult>({
    name: 'Advanced CI Calibration Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/ci-calibration-advanced.csv'),
    csvHeader: [
      'trial_id', 'seed', 'depth', 'warmup', 'pass_rate',
      'true_size', 'estimated_size', 'ci_lower', 'ci_upper', 'true_in_ci'
    ],
    // High trial count for precision (±1.7% @ 1200)
    trialsPerConfig: getSampleSize(1200, 100),
    resultToRow: (r: AdvancedCICalibrationResult) => [
      r.trialId, r.seed, r.depth, r.warmup, r.passRate,
      r.trueSize, r.estimatedSize, r.ciLower, r.ciUpper, r.trueInCI
    ],
    parallel: {
      modulePath: fileURLToPath(import.meta.url),
      functionName: 'runTrial'
    }
  })

  await runner.run(scenarios, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAdvancedStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runAdvancedStudy }
