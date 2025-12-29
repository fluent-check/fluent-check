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
 * 1. Independent threshold: forall(a,b,c,d,e: int(0,10000000)).then(any < 10)
 *    - Property passes when ANY variable is < 10
 *    - Property fails when ALL variables are >= 10 (counterexamples)
 *    - Optimal minimal counterexample: (10, 10, 10, 10, 10) - smallest values that still fail
 *    - Large range (0-10,000,000) means shrinking from ~5M to 10 (logarithmic convergence)
 *    - 5 quantifiers to better reveal positional bias
 *    - Variables are independent (no compensating effects)
 *
 * Budget levels tested:
 * - 100 attempts (tight constraint, shows maximum bias)
 * - 500 attempts (moderate constraint)
 * - 2000 attempts (loose constraint, allows most strategies to converge)
 *
 * Key insight: Unlike compensating properties (e.g., a+b+c <= 150), independent
 * threshold properties don't allow one variable's shrink to force others to grow.
 * This reveals the true positional bias of each strategy under budget constraints.
 *
 * Metrics collected:
 * - Distance from optimal (10) for each variable
 * - Whether each variable reached optimal (10)
 * - Variance of final values (fairness)
 * - Mean distance from optimal
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
  quantifierOrder: string
  budget: number
  finalValues: number[]
  distances: number[]  // Distance from optimal (10) for each position
  optimals: number[]   // 1 if reached optimal (10), 0 otherwise
  variance: number
  meanDistance: number
  totalDistance: number
  attempts: number
  rounds: number
  elapsedMicros: number
}

interface StrategyComparisonParams {
  strategy: 'sequential-exhaustive' | 'round-robin' | 'delta-debugging'
  order: string  // e.g., 'abcde', 'edcba', 'caebd'
  budget: number
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

function calculateMeanDistance(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

const OPTIMAL_VALUE = 10
const MAX_RANGE = 10_000_000
const NUM_QUANTIFIERS = 5
const QUANTIFIER_NAMES = ['a', 'b', 'c', 'd', 'e']

function runTrial(
  params: StrategyComparisonParams,
  trialId: number
): StrategyComparisonResult {
  const { strategy: strategyType, order, budget } = params
  const seed = getSeed(trialId)

  // Create arbitraries for each quantifier
  const arbitraries: Record<string, ReturnType<typeof integer>> = {}
  for (const name of QUANTIFIER_NAMES) {
    arbitraries[name] = integer(0, MAX_RANGE)
  }

  // Build scenario with specified quantifier order
  let s = scenario()
  for (const char of order) {
    s = s.forall(char, arbitraries[char])
  }

  // Independent threshold property: at least one variable must be < 10
  // Passes when ANY variable is < 10
  // Fails when ALL variables are >= 10
  // Counterexamples: values where all are >= 10
  // Optimal minimal counterexample: (10, 10, 10, 10, 10) - the smallest values that still fail
  const propertyFn = (values: Record<string, number>) =>
    QUANTIFIER_NAMES.some(name => values[name] < OPTIMAL_VALUE)

  // Configure strategy with specified budget
  const strat = strategy()
    .withSampleSize(100)
    .withShrinking(budget)
    .withShrinkingStrategy(strategyType)

  // Get shrunk counterexample (with configured strategy)
  const timer = new HighResTimer()
  const shrunkenResult = s
    .then(propertyFn)
    .config(strat)
    .check({ seed })

  const elapsedMicros = timer.elapsedMicros()

  // Extract values in declaration order (order string)
  // Note: We don't have access to the initial counterexample before shrinking,
  // so we only record the final shrunk values
  const finalValues = order.split('').map(name => shrunkenResult.example[name] ?? 0)

  // Calculate distances from optimal value (10)
  const distances = finalValues.map(v => Math.abs(v - OPTIMAL_VALUE))
  const optimals = finalValues.map(v => v === OPTIMAL_VALUE ? 1 : 0)

  const totalDistance = distances.reduce((a, b) => a + b, 0)

  return {
    trialId,
    seed,
    strategy: strategyType,
    quantifierOrder: order,
    budget,
    finalValues,
    distances,
    optimals,
    variance: calculateVariance(finalValues),
    meanDistance: calculateMeanDistance(distances),
    totalDistance,
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

  // Different quantifier orders to test order independence
  // Using 5 quantifiers: a, b, c, d, e
  const orders: string[] = ['abcde', 'edcba', 'caebd']

  // Budget levels: tight (100), moderate (500), loose (2000)
  const budgets: number[] = [100, 500, 2000]

  // Generate all combinations
  const parameters: StrategyComparisonParams[] = []
  for (const strat of strategies) {
    for (const order of orders) {
      for (const budget of budgets) {
        parameters.push({ strategy: strat, order, budget })
      }
    }
  }

  // Build CSV header dynamically for 5 positions
  const positionHeaders: string[] = []
  for (let i = 1; i <= NUM_QUANTIFIERS; i++) {
    positionHeaders.push(`final_pos${i}`, `distance_pos${i}`, `optimal_pos${i}`)
  }

  const runner = new ExperimentRunner<StrategyComparisonParams, StrategyComparisonResult>({
    name: 'Shrinking Strategies Comparison Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/shrinking-strategies.csv'),
    csvHeader: [
      'trial_id', 'seed', 'strategy', 'quantifier_order', 'budget',
      ...positionHeaders,
      'variance', 'mean_distance', 'total_distance', 'attempts', 'rounds', 'elapsed_micros'
    ],
    trialsPerConfig: getSampleSize(200, 50),
    resultToRow: (r: StrategyComparisonResult) => {
      const positionData: number[] = []
      for (let i = 0; i < NUM_QUANTIFIERS; i++) {
        positionData.push(r.finalValues[i], r.distances[i], r.optimals[i])
      }
      return [
        r.trialId, r.seed, r.strategy, r.quantifierOrder, r.budget,
        ...positionData,
        r.variance, r.meanDistance, r.totalDistance, r.attempts, r.rounds, r.elapsedMicros
      ]
    },
    preRunInfo: () => {
      console.log('Comparing shrinking strategies:\n')
      console.log(`Strategies: ${strategies.join(', ')}`)
      console.log(`Budget levels: ${budgets.join(', ')} attempts`)
      console.log(`Quantifier orders: ${orders.join(', ')}`)
      console.log(`Number of quantifiers: ${NUM_QUANTIFIERS}`)
      console.log(`Property: forall(${QUANTIFIER_NAMES.join(',')}: int(0,${MAX_RANGE})).then(any < ${OPTIMAL_VALUE})`)
      console.log(`Optimal counterexample: (${Array(NUM_QUANTIFIERS).fill(OPTIMAL_VALUE).join(', ')})`)
      console.log(`\nExpected results:`)
      console.log(`- Sequential Exhaustive: First quantifier reaches optimal, others lag behind`)
      console.log(`- Round-Robin: More balanced distribution of shrink attempts`)
      console.log(`- Delta Debugging: Best fairness with more even shrinking`)
      console.log()
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id))
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
