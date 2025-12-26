/**
 * Shrinking Strategies Comparison Study
 *
 * This study empirically compares different shrinking strategies to validate
 * the fairness improvements and performance trade-offs.
 *
 * Strategies tested:
 * 1. Sequential Exhaustive (baseline) - Current behavior
 * 2. Round-Robin (proposed default) - Fair shrinking
 * 3. Delta Debugging (maximum quality) - Highest fairness
 *
 * Properties tested:
 * 1. Sum constraint: forall(a,b,c: int(0,100)).then(a+b+c <= 150)
 * 2. Product constraint: forall(x,y: int(1,50)).then(x*y <= 100)
 * 3. Triangle inequality: forall(a,b,c: int(0,100)).then(a+b>=c && b+c>=a && a+c>=b)
 *
 * Metrics collected:
 * - Variance of final values (fairness)
 * - Mean distance from origin
 * - Number of shrink attempts
 * - Number of successful rounds
 * - Wall-clock time (microseconds)
 * - Quantifier order effect
 */

import { scenario, integer, strategy } from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, HighResTimer } from './runner.js'
import path from 'path'

interface StrategyComparisonResult {
  trialId: number
  seed: number
  strategy: 'sequential-exhaustive' | 'round-robin' | 'delta-debugging'
  quantifierOrder: 'abc' | 'bac' | 'cab'
  property: 'sum' | 'product' | 'triangle'
  initialA: number
  initialB: number
  initialC: number
  finalA: number
  finalB: number
  finalC: number
  variance: number
  meanDistance: number
  attempts: number
  rounds: number
  elapsedMicros: number
}

interface StrategyComparisonParams {
  strategy: 'sequential-exhaustive' | 'round-robin' | 'delta-debugging'
  order: 'abc' | 'bac' | 'cab'
  property: 'sum' | 'product' | 'triangle'
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

function calculateMeanDistance(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function runTrial(
  params: StrategyComparisonParams,
  trialId: number
): StrategyComparisonResult {
  const { strategy: strategyType, order, property: propertyType } = params
  const seed = getSeed(trialId)

  const arbA = integer(0, 100)
  const arbB = integer(0, 100)
  const arbC = integer(0, 100)

  // Build scenario with specified quantifier order
  let s = scenario()
  if (order === 'abc') {
    s = s.forall('a', arbA).forall('b', arbB).forall('c', arbC)
  } else if (order === 'bac') {
    s = s.forall('b', arbB).forall('a', arbA).forall('c', arbC)
  } else {
    s = s.forall('c', arbC).forall('a', arbA).forall('b', arbB)
  }

  // Select property based on type
  let propertyFn: (ctx: any) => boolean
  if (propertyType === 'sum') {
    propertyFn = ({ a, b, c }: any) => a + b + c <= 150
  } else if (propertyType === 'product') {
    // For product, use only a and b (c is unused)
    propertyFn = ({ a, b }: any) => a * b <= 100
  } else {
    // Triangle inequality
    propertyFn = ({ a, b, c }: any) => a + b >= c && b + c >= a && a + c >= b
  }

  // Configure strategy
  const strat = strategy()
    .withSampleSize(100)
    .withShrinking(500)
    .withShrinkingStrategy(strategyType)

  // Get initial counterexample (without shrinking)
  const initialResult = s
    .then(propertyFn)
    .config(strategy().withSampleSize(100).withoutShrinking())
    .check({ seed })

  // Get shrunk counterexample (with configured strategy)
  const timer = new HighResTimer()
  const shrunkenResult = s
    .then(propertyFn)
    .config(strat)
    .check({ seed })

  const elapsedMicros = timer.elapsedMicros()

  const initialValues = [
    initialResult.example.a ?? 0,
    initialResult.example.b ?? 0,
    initialResult.example.c ?? 0
  ]

  const finalValues = [
    shrunkenResult.example.a ?? 0,
    shrunkenResult.example.b ?? 0,
    shrunkenResult.example.c ?? 0
  ]

  return {
    trialId,
    seed,
    strategy: strategyType,
    quantifierOrder: order,
    property: propertyType,
    initialA: initialValues[0],
    initialB: initialValues[1],
    initialC: initialValues[2],
    finalA: finalValues[0],
    finalB: finalValues[1],
    finalC: finalValues[2],
    variance: calculateVariance(finalValues),
    meanDistance: calculateMeanDistance(finalValues),
    attempts: shrunkenResult.statistics?.shrinkAttempts ?? 0,
    rounds: shrunkenResult.statistics?.shrinkRounds ?? 0,
    elapsedMicros
  }
}

async function runShrinkingStrategiesComparisonStudy(): Promise<void> {
  const strategies: ('sequential-exhaustive' | 'round-robin' | 'delta-debugging')[] = [
    'sequential-exhaustive',
    'round-robin',
    'delta-debugging'
  ]

  const orders: ('abc' | 'bac' | 'cab')[] = ['abc', 'bac', 'cab']

  const properties: ('sum' | 'product' | 'triangle')[] = ['sum', 'product', 'triangle']

  // Generate all combinations
  const parameters: StrategyComparisonParams[] = []
  for (const strategy of strategies) {
    for (const order of orders) {
      for (const property of properties) {
        parameters.push({ strategy, order, property })
      }
    }
  }

  const runner = new ExperimentRunner<StrategyComparisonParams, StrategyComparisonResult>({
    name: 'Shrinking Strategies Comparison Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/shrinking-strategies.csv'),
    csvHeader: [
      'trial_id', 'seed', 'strategy', 'quantifier_order', 'property',
      'initial_a', 'initial_b', 'initial_c',
      'final_a', 'final_b', 'final_c',
      'variance', 'mean_distance', 'attempts', 'rounds', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: StrategyComparisonResult) => [
      r.trialId, r.seed, r.strategy, r.quantifierOrder, r.property,
      r.initialA, r.initialB, r.initialC,
      r.finalA, r.finalB, r.finalC,
      r.variance, r.meanDistance, r.attempts, r.rounds, r.elapsedMicros
    ],
    preRunInfo: () => {
      console.log('Comparing shrinking strategies:\n')
      console.log(`Strategies: ${strategies.join(', ')}`)
      console.log(`Properties: ${properties.join(', ')}`)
      console.log(`Quantifier orders: ${orders.join(', ')}`)
      console.log(`\nExpected results:`)
      console.log(`- Sequential Exhaustive: High variance (biased toward first quantifier)`)
      console.log(`- Round-Robin: 50-80% variance reduction`)
      console.log(`- Delta Debugging: 90-97% variance reduction`)
      console.log()
    }
  })

  await runner.run(parameters, runTrial)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runShrinkingStrategiesComparisonStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runShrinkingStrategiesComparisonStudy }
