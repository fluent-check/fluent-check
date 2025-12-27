/**
 * Sample Budget Distribution Study: Effective sample size in Nested Loop Exploration
 *
 * Checks how many distinct values are actually tested for each quantifier
 * given a global sample budget N.
 *
 * Hypothesis: Effective sample size per quantifier is N^(1/depth), not N.
 * This implies poor detection for bugs depending on single-variable specific values
 * when depth is high.
 */

import * as fc from '../../src/index.js'
import { ExperimentRunner, getSeed, getSampleSize, mulberry32, CSVWriter, ProgressReporter } from './runner.js'
import { createFlatExplorer } from '../../src/strategies/FlatExplorer.js'
import { createNestedLoopExplorer } from '../../src/strategies/Explorer.js'
import path from 'path'

interface BudgetResult {
  trialId: number
  seed: number
  depth: number
  explorer: 'nested' | 'flat'
  totalTests: number
  quantifierIndex: number
  uniqueValues: number
  expectedUnique: number
  detectionRate: number // For a specific magic value
}

interface SampleBudgetParams {
  depth: number
  explorer: 'nested' | 'flat'
  totalTests: number
}

function runTrial(
  params: SampleBudgetParams,
  trialId: number
): BudgetResult[] {
  const { depth, explorer, totalTests } = params
  const seed = getSeed(trialId)
  
  // Calculate expected distinct samples per quantifier (floor(N^(1/d))) for nested
  // For flat, we expect close to totalTests (N)
  const expectedUnique = explorer === 'nested' 
    ? Math.floor(Math.pow(totalTests, 1 / depth))
    : totalTests
  
  // Create scenario with 'depth' quantifiers
  let s = fc.scenario()
  for (let i = 0; i < depth; i++) {
    // Large domain to avoid collisions
    s = s.forall(`q${i}`, fc.integer(0, 1000000))
  }
  
  const explorerFactory = explorer === 'flat' ? createFlatExplorer : createNestedLoopExplorer

  // We want to count unique values for EACH quantifier
  // We can use DetailedStatistics
  const result = s
    .then(() => true)
    .config(fc.strategy()
      .withSampleSize(totalTests)
      .withDetailedStatistics()
      .withRandomGenerator(mulberry32, seed)
      .withExplorer(explorerFactory))
    .check()
    
  const results: BudgetResult[] = []
  
  if (result.statistics.arbitraryStats) {
    for (let i = 0; i < depth; i++) {
      const name = `q${i}`
      const stats = result.statistics.arbitraryStats[name]
      
      results.push({
        trialId,
        seed,
        depth,
        explorer,
        totalTests,
        quantifierIndex: i,
        uniqueValues: stats.uniqueValues,
        expectedUnique,
        detectionRate: stats.uniqueValues / 1000001
      })
    }
  }
  
  return results
}

async function runSampleBudgetStudy(): Promise<void> {
  const depths = [1, 2, 3, 5]
  const totalTests = 1000 // Fixed budget
  const explorers = ['nested', 'flat'] as const

  const parameters: SampleBudgetParams[] = []
  for (const depth of depths) {
    for (const explorer of explorers) {
      parameters.push({
        depth,
        explorer,
        totalTests
      })
    }
  }

  const runner = new ExperimentRunner<SampleBudgetParams, BudgetResult[]>({
    name: 'Sample Budget Distribution Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/sample-budget.csv'),
    csvHeader: [
      'trial_id', 'seed', 'depth', 'explorer', 'total_tests',
      'quantifier_index', 'unique_values', 'expected_unique', 'detection_rate'
    ],
    trialsPerConfig: getSampleSize(50, 10),
    resultToRow: (_r: BudgetResult[]) => [], // Not used
    preRunInfo: () => {
      console.log('Hypothesis: FlatExplorer maintains effective sample size N independent of depth.\n')
      console.log(`Total tests budget: ${totalTests}`)
      console.log(`Depths: ${depths.join(', ')}`)
      console.log(`Explorers: ${explorers.join(', ')}`)
    }
  })

  // Custom execution for multiple rows per trial
  console.log(`\n=== ${runner.config.name} ===`)
  if (runner.config.preRunInfo) runner.config.preRunInfo()
  
  const writer = new CSVWriter(runner.config.outputPath)
  writer.writeHeader(runner.config.csvHeader)
  
  const trialsPerConfig = runner.config.trialsPerConfig
  const totalTrials = parameters.length * trialsPerConfig
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)
  
  const progress = new ProgressReporter(totalTrials, 'SampleBudget')
  
  let trialId = 0
  for (const params of parameters) {
    for (let i = 0; i < trialsPerConfig; i++) {
      const results = runTrial(params, trialId)
      for (const res of results) {
        writer.writeRow([
          res.trialId,
          res.seed,
          res.depth,
          res.explorer,
          res.totalTests,
          res.quantifierIndex,
          res.uniqueValues,
          res.expectedUnique,
          res.detectionRate
        ])
      }
      progress.update()
      trialId++
    }
  }
  
  progress.finish()
  await writer.close()
  
  console.log(`\n✓ ${runner.config.name} complete`)
  console.log(`  Output: ${runner.config.outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSampleBudgetStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runSampleBudgetStudy }
