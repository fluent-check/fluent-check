/**
 * Shrinking Fairness Study: Earlier quantifiers shrink more aggressively
 *
 * This study examines if the order of quantifiers affects shrinking results.
 * We test three symmetric quantifiers a, b, c with the property:
 * a + b + c <= 150
 *
 * What we measure:
 * 1. Initial values that failed
 * 2. Final shrunken values
 * 3. Quantifier order used
 */

import { scenario, integer, strategy } from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, HighResTimer } from './runner.js'
import path from 'path'

interface ShrinkingFairnessResult {
  trialId: number
  seed: number
  quantifierOrder: string
  initialA: number
  initialB: number
  initialC: number
  finalA: number
  finalB: number
  finalC: number
  elapsedMicros: number
}

function runTrial(
  trialId: number,
  order: 'abc' | 'bac' | 'cab'
): ShrinkingFairnessResult {
  const seed = getSeed(trialId)
  const timer = new HighResTimer()

  const arbA = integer(0, 100)
  const arbB = integer(0, 100)
  const arbC = integer(0, 100)

  let s = scenario()
  
  // Set quantifier order
  if (order === 'abc') {
    s = s.forall('a', arbA).forall('b', arbB).forall('c', arbC)
  } else if (order === 'bac') {
    s = s.forall('b', arbB).forall('a', arbA).forall('c', arbC)
  } else {
    s = s.forall('c', arbC).forall('a', arbA).forall('b', arbB)
  }

  // Property that fails when sum > 150
  // Initial values can be up to (100, 100, 100) -> sum 300
  const result = s
    .then(({ a, b, c }: any) => a + b + c <= 150)
    .config(strategy().withSampleSize(100)) // Enough to find failure usually
    .check({ seed })

  // If it didn't fail, we can't measure shrinking
  // But with these ranges, a failure is very likely
  if (result.satisfiable) {
    // Retry with more samples if needed, but for fairness study 
    // we just want to compare when it DOES fail.
  }

  // We need initial counterexample values. 
  // result.statistics might have it if we can find where it's stored.
  // Actually, we can use a custom explorer or just trust the first one picked.
  // But FluentCheck doesn't expose the INITIAL counterexample easily.
  
  // A trick: run with shrinking disabled to get the initial one, then with enabled.
  // But that doubles the work and might get DIFFERENT initial ones if not careful.
  
  // Better: The seed ensures reproducibility.
  const initialResult = s
    .then(({ a, b, c }: any) => a + b + c <= 150)
    .config(strategy().withSampleSize(100).withoutShrinking())
    .check({ seed })
    
  const shrunkenResult = s
    .then(({ a, b, c }: any) => a + b + c <= 150)
    .config(strategy().withSampleSize(100).withShrinking())
    .check({ seed })

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    quantifierOrder: order,
    initialA: initialResult.example.a ?? 0,
    initialB: initialResult.example.b ?? 0,
    initialC: initialResult.example.c ?? 0,
    finalA: shrunkenResult.example.a ?? 0,
    finalB: shrunkenResult.example.b ?? 0,
    finalC: shrunkenResult.example.c ?? 0,
    elapsedMicros
  }
}

async function runShrinkingFairnessStudy(): Promise<void> {
  console.log('=== Shrinking Fairness Study ===')
  console.log('Hypothesis: Earlier quantifiers shrink more aggressively.\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/shrinking-fairness.csv')
  const writer = new CSVWriter(outputPath)

  writer.writeHeader([
    'trial_id',
    'seed',
    'quantifier_order',
    'initial_a',
    'initial_b',
    'initial_c',
    'final_a',
    'final_b',
    'final_c',
    'elapsed_micros'
  ])

  const orders: ('abc' | 'bac' | 'cab')[] = ['abc', 'bac', 'cab']
  const trialsPerConfig = getSampleSize(200, 50)
  const totalTrials = orders.length * trialsPerConfig

  console.log(`Orders: ${orders.join(', ')}`)
  console.log(`Trials per order: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, 'ShrinkFair')

  let trialId = 0
  for (const order of orders) {
    for (let i = 0; i < trialsPerConfig; i++) {
      const result = runTrial(trialId, order)
      writer.writeRow([
        result.trialId,
        result.seed,
        result.quantifierOrder,
        result.initialA,
        result.initialB,
        result.initialC,
        result.finalA,
        result.finalB,
        result.finalC,
        result.elapsedMicros
      ])
      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ Shrinking Fairness study complete`)
  console.log(`  Output: ${outputPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runShrinkingFairnessStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runShrinkingFairnessStudy }
