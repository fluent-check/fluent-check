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
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32 } from './runner.js'
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

function runTrial(
  trialId: number,
  depth: number,
  totalTests: number,
  explorerType: 'nested' | 'flat'
): BudgetResult[] {
  const seed = getSeed(trialId)
  
  // Calculate expected distinct samples per quantifier (floor(N^(1/d))) for nested
  // For flat, we expect close to totalTests (N)
  const expectedUnique = explorerType === 'nested' 
    ? Math.floor(Math.pow(totalTests, 1 / depth))
    : totalTests
  
  // Create scenario with 'depth' quantifiers
  let s = fc.scenario()
  for (let i = 0; i < depth; i++) {
    // Large domain to avoid collisions
    s = s.forall(`q${i}`, fc.integer(0, 1000000))
  }
  
  const explorerFactory = explorerType === 'flat' ? createFlatExplorer : createNestedLoopExplorer

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
      
      // Also check detection of a magic value?
      // We can infer detection probability from uniqueValues / Domain
      // P(detect) = 1 - (1 - 1/Domain)^uniqueValues ~ uniqueValues/Domain
      
      results.push({
        trialId,
        seed,
        depth,
        explorer: explorerType,
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
  console.log('=== Sample Budget Distribution Study ===')
  console.log('Hypothesis: FlatExplorer maintains effective sample size N independent of depth.\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/sample-budget.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'depth',
    'explorer',
    'total_tests',
    'quantifier_index',
    'unique_values',
    'expected_unique',
    'detection_rate'
  ])

  // Study parameters
  const depths = [1, 2, 3, 5]
  const totalTests = 1000 // Fixed budget
  const trialsPerConfig = getSampleSize(50, 10)
  const explorers = ['nested', 'flat'] as const

  console.log(`Total tests budget: ${totalTests}`)
  console.log(`Depths: ${depths.join(', ')}`)
  console.log(`Explorers: ${explorers.join(', ')}`)
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  
  // Calculate total rows (each trial returns 'depth' rows)
  let totalRows = 0
  for (const d of depths) totalRows += trialsPerConfig * d * explorers.length
  
  console.log(`Total rows to write: ${totalRows}\n`)

  const progress = new ProgressReporter(trialsPerConfig * depths.length * explorers.length, 'SampleBudget')

  let trialId = 0
  for (const depth of depths) {
    for (const explorer of explorers) {
      for (let i = 0; i < trialsPerConfig; i++) {
        const results = runTrial(trialId, depth, totalTests, explorer)
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
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Sample Budget study complete`)
  console.log(`  Output: ${outputPath}`)
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
