/**
 * Study L: Correlation Effects on CI Calibration
 * 
 * Investigates how correlation between arbitraries affects the conservatism
 * of interval arithmetic in products (tuples) and sums (unions).
 * 
 * Hypotheses:
 * 1. Independent compositions (Tuple/Union of different instances) show high conservatism (~98% coverage)
 *    because interval arithmetic ignores the variance reduction from independence.
 * 2. Correlated compositions (Tuple/Union of SAME instance) show normal calibration (~92% coverage)
 *    because the interval bounds perfectly match the correlated movements.
 * 3. Dependent nested filters (A.filter(p1).filter(p2)) are well-calibrated (~92% coverage)
 *    because they represent sequential Bayesian updates.
 */

import * as fc from '../../src/index.js'
import { FilteredArbitrary } from '../../src/arbitraries/FilteredArbitrary.js'
import { ExperimentRunner, calculateRequiredSampleSize, printPowerAnalysis, getSeed, mulberry32 } from './runner.js'

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const TARGET_PROPORTION = 0.90 // 90% coverage
const MIN_DETECTABLE_DEVIATION = 0.05 // ±5%
const POWER = 0.95
const ALPHA = 0.05

// Calculate required trials
const powerAnalysis = calculateRequiredSampleSize({
  targetProportion: TARGET_PROPORTION,
  minDetectableDeviation: MIN_DETECTABLE_DEVIATION,
  power: POWER,
  alpha: ALPHA
})

const TRIALS = 600 // Rounded up from ~564
const WARMUP_SAMPLES = 50 // Sufficient for convergence per Study A

// -----------------------------------------------------------------------------
// Parameters & Types
// -----------------------------------------------------------------------------

type ScenarioType = 
  | 'product_independent' 
  | 'product_correlated' 
  | 'sum_independent' 
  | 'sum_correlated'
  | 'nested_dependent'

interface Params {
  scenario: ScenarioType
  passRate: number // Target pass rate for the filter(s)
}

interface Result {
  scenario: ScenarioType
  passRate: number
  trueSize: number
  estimatedSize: number
  ciLower: number
  ciUpper: number
  ciWidth: number
  covered: boolean
  relativeError: number
}

// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------

function runTrial(params: Params, trialId: number): Result {
  const seed = getSeed(trialId)
  const prng = mulberry32(seed)
  const baseSize = 1000

  // Create base arbitrary (deterministic integer range)
  const baseArb = fc.integer(0, baseSize - 1)

  // Create deterministic filter predicate matching target pass rate
  // Using modulo to ensure exact pass rate
  const modulus = Math.round(1 / params.passRate)
  const predicate = (x: number) => x % modulus === 0
  const filterTrueSize = Math.floor(baseSize / modulus) + (baseSize % modulus > 0 ? 1 : 0) // Approximation, close enough for large base

  // Helper to sample and warm up an arbitrary
  const warmUp = (arb: fc.Arbitrary<any>) => {
    // Create a NEW instance of FilteredArbitrary if needed by wrapping/unwrapping
    // But here we construct them explicitly below
    
    // Sample to warm up estimates
    for (let i = 0; i < WARMUP_SAMPLES; i++) {
      arb.pick(prng)
    }
  }

  let arb: fc.Arbitrary<any>
  let trueSize: number

  switch (params.scenario) {
    case 'product_independent': {
      // Two distinct filter instances
      const f1 = baseArb.filter(predicate)
      const f2 = baseArb.filter(predicate)
      arb = fc.tuple(f1, f2)
      trueSize = filterTrueSize * filterTrueSize
      break
    }
    case 'product_correlated': {
      // Same filter instance reused
      const f1 = baseArb.filter(predicate)
      arb = fc.tuple(f1, f1)
      trueSize = filterTrueSize * filterTrueSize
      break
    }
    case 'sum_independent': {
      // Two distinct filter instances
      const f1 = baseArb.filter(predicate)
      const f2 = baseArb.filter(predicate)
      arb = fc.union(f1, f2)
      trueSize = filterTrueSize + filterTrueSize
      break
    }
    case 'sum_correlated': {
      // Same filter instance reused
      const f1 = baseArb.filter(predicate)
      arb = fc.union(f1, f1)
      trueSize = filterTrueSize + filterTrueSize
      break
    }
    case 'nested_dependent': {
      // arb1.filter(p2) - simulating user example
      // integer(0,100).filter(>30).filter(<70)
      // We'll use modulo logic to simulate specific rates
      // Layer 1: passRate (e.g. 0.5)
      // Layer 2: passRate (e.g. 0.5)
      // Total size = Base * p * p
      const f1 = baseArb.filter(predicate)
      // For second layer, we want it to filter the output of f1
      // We use the same predicate for simplicity, effectively p^2 total rate
      // But we need to ensure it's not "correlated" in a way that f1 already implies f2
      // So we use a different modulus or offset
      // Actually, let's just use a different offset for the second filter
      // p1: x % mod == 0
      // p2: (x / mod) % mod == 0
      const p2 = (x: number) => Math.floor(x / modulus) % modulus === 0
      arb = f1.filter(p2)
      
      // Calculate true size: count numbers satisfying both
      let count = 0
      for (let i = 0; i < baseSize; i++) {
        if (predicate(i) && p2(i)) count++
      }
      trueSize = count
      break
    }
  }

  warmUp(arb)

  const sizeEst = arb.size()
  const estValue = sizeEst.value
  const ci = sizeEst.credibleInterval
  
  // Handle point estimates (if exact)
  const lower = sizeEst.type === 'exact' ? estValue : ci[0]
  const upper = sizeEst.type === 'exact' ? estValue : ci[1]

  return {
    scenario: params.scenario,
    passRate: params.passRate,
    trueSize,
    estimatedSize: estValue,
    ciLower: lower,
    ciUpper: upper,
    ciWidth: upper - lower,
    covered: trueSize >= lower && trueSize <= upper,
    relativeError: Math.abs(estValue - trueSize) / Math.max(1, trueSize)
  }
}

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

const runner = new ExperimentRunner({
  name: 'Correlation Effects Study',
  outputPath: 'analysis/correlation_effects.csv',
  csvHeader: [
    'scenario', 'pass_rate', 
    'true_size', 'estimated_size', 
    'ci_lower', 'ci_upper', 'ci_width', 
    'covered', 'relative_error'
  ],
  trialsPerConfig: TRIALS,
  resultToRow: r => [
    r.scenario, r.passRate,
    r.trueSize, r.estimatedSize,
    r.ciLower, r.ciUpper, r.ciWidth,
    r.covered, r.relativeError
  ],
  preRunInfo: () => printPowerAnalysis(powerAnalysis)
})

const scenarios: ScenarioType[] = [
  'product_independent', 'product_correlated',
  'sum_independent', 'sum_correlated',
  'nested_dependent'
]

const passRates = [0.5, 0.1] // 50% and 10%

const params: Params[] = scenarios.flatMap(scenario => 
  passRates.map(passRate => ({ scenario, passRate }))
)

runner.run(params, runTrial).catch(e => {
  console.error(e)
  process.exit(1)
})
