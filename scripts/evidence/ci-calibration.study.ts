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
  *     bounds simultaneously is less than the product of their individual tail
  *     probabilities.
  */
 
 import * as fc from '../../src/index.js'
 import { ExperimentRunner, getSeed, getSampleSize, mulberry32 } from './runner.js'
 import path from 'path'
 import { fileURLToPath } from 'url'
 
 // Target significance level from util.ts
 const TARGET_COVERAGE = 0.90
 
 export interface CICalibrationResult {
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
 
 export interface CICalibrationParams {
   scenario: string
   // Add any other serializable params if needed, but scenario string is enough for now
 }
 
 /**
  * Factory to create arbitraries based on scenario name
  * This replaces the non-serializable createArbitrary function in params
  */
 function getArbitraryForScenario(scenario: string, seed: number): {
   arb: fc.Arbitrary<unknown>
   trueSize: number
   warmupCount: number
 } {
   // Scenario 1: Single Filter (filter_Xpct)
   const filterMatch = scenario.match(/^filter_(\d+)pct$/)
   if (filterMatch && !scenario.includes('chain')) {
     const passRate = parseInt(filterMatch[1], 10) / 100
     const baseSize = 1000
     const threshold = Math.floor(baseSize * passRate)
     const arb = fc.integer(0, baseSize - 1).filter(x => x < threshold)
     return {
       arb,
       trueSize: threshold,
       warmupCount: 200
     }
   }
 
   // Scenario 2: Tuple Exact
   if (scenario === 'tuple_exact_2x') {
     const arb1 = fc.integer(0, 9) // size 10
     const arb2 = fc.integer(0, 4) // size 5
     const arb = fc.tuple(arb1, arb2)
     return { arb, trueSize: 50, warmupCount: 0 }
   }
   if (scenario === 'tuple_exact_3x') {
     const arb1 = fc.integer(0, 4) // size 5
     const arb2 = fc.integer(0, 3) // size 4
     const arb3 = fc.integer(0, 2) // size 3
     const arb = fc.tuple(arb1, arb2, arb3)
     return { arb, trueSize: 60, warmupCount: 0 }
   }
 
   // Scenario 3: Tuple Filtered (tuple_filtered_Xpct)
   const tupleFilterMatch = scenario.match(/^tuple_filtered_(\d+)pct$/)
   if (tupleFilterMatch) {
     const passRate = parseInt(tupleFilterMatch[1], 10) / 100
     const baseSize = 100
     const threshold = Math.floor(baseSize * passRate)
     const arb1 = fc.integer(0, baseSize - 1).filter(x => x < threshold)
     const arb2 = fc.integer(0, 4) // size 5
     const arb = fc.tuple(arb1, arb2)
     return {
       arb,
       trueSize: threshold * 5,
       warmupCount: 200
     }
   }
 
   // Scenario 4: Union Exact
   if (scenario === 'union_exact_2x') {
     const arb1 = fc.integer(0, 9) // size 10
     const arb2 = fc.integer(100, 104) // size 5
     const arb = fc.union(arb1, arb2)
     return { arb, trueSize: 15, warmupCount: 0 }
   }
   if (scenario === 'union_exact_3x') {
     const arb1 = fc.integer(0, 4) // size 5
     const arb2 = fc.integer(100, 103) // size 4
     const arb3 = fc.integer(200, 202) // size 3
     const arb = fc.union(arb1, arb2, arb3)
     return { arb, trueSize: 12, warmupCount: 0 }
   }
 
   // Scenario 5: Union Filtered (union_filtered_Xpct)
   const unionFilterMatch = scenario.match(/^union_filtered_(\d+)pct$/)
   if (unionFilterMatch) {
     const passRate = parseInt(unionFilterMatch[1], 10) / 100
     const baseSize = 100
     const threshold = Math.floor(baseSize * passRate)
     const arb1 = fc.integer(0, baseSize - 1).filter(x => x < threshold)
     const arb2 = fc.integer(1000, 1009) // size 10
     const arb = fc.union(arb1, arb2)
     return {
       arb,
       trueSize: threshold + 10,
       warmupCount: 200
     }
   }
 
   // Scenario 6: Filter Chain (filter_chain_depthN)
   const chainMatch = scenario.match(/^filter_chain_depth(\d+)$/)
   if (chainMatch) {
     const depth = parseInt(chainMatch[1], 10)
     const baseSize = 1000
     const passRate = 0.7

     // MurmurHash3 32-bit mixing function for robust deterministic hashing
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

     return {
       arb,
       trueSize,
       warmupCount: 300
     }
   }
 
   // Scenario 7: Nested
   if (scenario === 'tuple_of_unions') {
     const union1 = fc.union(fc.integer(0, 4), fc.integer(100, 102)) // 8
     const union2 = fc.union(fc.integer(200, 201), fc.integer(300, 303)) // 6
     const arb = fc.tuple(union1, union2)
     return { arb, trueSize: 48, warmupCount: 0 }
   }
   if (scenario === 'union_of_tuples') {
     const tuple1 = fc.tuple(fc.integer(0, 2), fc.integer(0, 1)) // 6
     const tuple2 = fc.tuple(fc.integer(100, 103), fc.integer(100, 101)) // 8
     const arb = fc.union(tuple1, tuple2)
     return { arb, trueSize: 14, warmupCount: 0 }
   }
 
   throw new Error(`Unknown scenario: ${scenario}`)
 }

 /**
  * Warm up the arbitrary by sampling from it.
  * This allows the Beta distribution posterior to update based on pass/fail rates.
  */
 function warmupArbitrary(
   arb: fc.Arbitrary<unknown>,
   count: number,
   generator: () => number
 ): void {
   for (let i = 0; i < count; i++) {
     arb.pick(generator)
   }
 }
 
 export function runTrial(
   params: CICalibrationParams,
   trialId: number,
   indexInConfig: number
 ): CICalibrationResult {
   const { scenario } = params
   const seed = getSeed(indexInConfig)
   const generator = mulberry32(seed)
 
   // Create the arbitrary using factory
   const { arb, trueSize, warmupCount } = getArbitraryForScenario(scenario, seed)
 
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
 
   // Scenario 1: Single Filter
   for (const passRate of [0.1, 0.3, 0.5, 0.7, 0.9]) {
     scenarios.push({ scenario: `filter_${(passRate * 100).toFixed(0)}pct` })
   }
 
   // Scenario 2: Tuple Exact
   scenarios.push({ scenario: 'tuple_exact_2x' })
   scenarios.push({ scenario: 'tuple_exact_3x' })
 
   // Scenario 3: Tuple Filtered
   for (const passRate of [0.3, 0.5, 0.7]) {
     scenarios.push({ scenario: `tuple_filtered_${(passRate * 100).toFixed(0)}pct` })
   }
 
   // Scenario 4: Union Exact
   scenarios.push({ scenario: 'union_exact_2x' })
   scenarios.push({ scenario: 'union_exact_3x' })
 
   // Scenario 5: Union Filtered
   for (const passRate of [0.3, 0.5, 0.7]) {
     scenarios.push({ scenario: `union_filtered_${(passRate * 100).toFixed(0)}pct` })
   }
 
   // Scenario 6: Chained Filters
   for (const depth of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
     scenarios.push({ scenario: `filter_chain_depth${depth}` })
   }
 
   // Scenario 7: Nested
   scenarios.push({ scenario: 'tuple_of_unions' })
   scenarios.push({ scenario: 'union_of_tuples' })
 
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
     // Increase trials to 3200 for high resolution (±1.0% margin of error)
     trialsPerConfig: getSampleSize(3200, 100),
     resultToRow: (r: CICalibrationResult) => [
       r.trialId, r.seed, r.scenario, r.trueSize, r.estimatedSize,
       r.ciLower.toFixed(2), r.ciUpper.toFixed(2), r.ciWidth.toFixed(2),
       r.trueInCI, r.warmupSamples, r.relativeError.toFixed(6)
     ],
     parallel: {
       modulePath: fileURLToPath(import.meta.url),
       functionName: 'runTrial'
     },
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
