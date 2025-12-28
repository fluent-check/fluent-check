/**
 * Lazy Shrinking Simulation Study
 *
 * This study simulates the expected improvement from lazy iterator-based
 * binary search shrinking compared to the current random sampling approach.
 *
 * Key insight: The current architecture pre-samples 100 random candidates
 * from the shrink space. This study compares:
 *
 * 1. Random Sampling (current): Sample 100 random values from [target, current]
 * 2. Binary Search (proposed): Deterministic binary search with feedback
 *
 * We measure:
 * - Number of attempts needed to reach optimal
 * - Distance from optimal after fixed budget
 * - Convergence rate
 *
 * The simulation doesn't require code changes - it models the algorithms
 * mathematically to predict the improvement from Phase 1.
 */

import { ExperimentRunner, getSeed, getSampleSize } from './runner.js'
import path from 'path'

interface ShrinkSimulationResult {
  trialId: number
  seed: number
  algorithm: 'random-100' | 'random-weighted' | 'binary-search'
  startValue: number
  targetValue: number
  budget: number
  finalValue: number
  distance: number
  attemptsUsed: number
  converged: boolean
  convergenceAttempt: number | null  // Which attempt reached optimal, or null
}

interface ShrinkSimulationParams {
  algorithm: 'random-100' | 'random-weighted' | 'binary-search'
  startValue: number
  targetValue: number
  budget: number
}

// Simulate a property that fails for values >= target
// (we want to shrink toward target)
function propertyFails(value: number, target: number): boolean {
  return value >= target
}

// Random sampling: pick 100 random values from [target, current]
function randomSamplingShrink(
  start: number,
  target: number,
  budget: number,
  rng: () => number
): { final: number; attempts: number; convergenceAttempt: number | null } {
  let current = start
  let attempts = 0
  let convergenceAttempt: number | null = null

  while (attempts < budget && current > target) {
    // Sample up to 100 candidates (or remaining budget)
    const sampleSize = Math.min(100, budget - attempts)
    const candidates: number[] = []

    for (let i = 0; i < sampleSize; i++) {
      // Random value in [target, current - 1]
      if (current > target) {
        const candidate = target + Math.floor(rng() * (current - target))
        candidates.push(candidate)
      }
    }

    // Sort to try smaller values first (biased toward shrinking)
    candidates.sort((a, b) => a - b)

    let foundSmaller = false
    for (const candidate of candidates) {
      attempts++
      if (propertyFails(candidate, target)) {
        current = candidate
        foundSmaller = true
        if (current === target && convergenceAttempt === null) {
          convergenceAttempt = attempts
        }
        break  // Accept first successful shrink
      }
    }

    if (!foundSmaller) break  // No more shrinking possible
  }

  return { final: current, attempts, convergenceAttempt }
}

// Weighted sampling (80/20): 80% from [target, mid], 20% from [mid+1, current]
function weightedSamplingShrink(
  start: number,
  target: number,
  budget: number,
  rng: () => number
): { final: number; attempts: number; convergenceAttempt: number | null } {
  let current = start
  let attempts = 0
  let convergenceAttempt: number | null = null

  while (attempts < budget && current > target) {
    const sampleSize = Math.min(100, budget - attempts)
    const candidates: number[] = []
    const mid = Math.floor((target + current) / 2)

    for (let i = 0; i < sampleSize; i++) {
      if (current <= target) break

      if (rng() < 0.8 && mid >= target) {
        // 80% from smaller half [target, mid]
        const candidate = target + Math.floor(rng() * (mid - target + 1))
        candidates.push(candidate)
      } else if (mid + 1 < current) {
        // 20% from larger half [mid+1, current-1]
        const candidate = mid + 1 + Math.floor(rng() * (current - mid - 1))
        candidates.push(candidate)
      } else if (mid >= target) {
        // Fallback to smaller half
        const candidate = target + Math.floor(rng() * (mid - target + 1))
        candidates.push(candidate)
      }
    }

    candidates.sort((a, b) => a - b)

    let foundSmaller = false
    for (const candidate of candidates) {
      attempts++
      if (propertyFails(candidate, target)) {
        current = candidate
        foundSmaller = true
        if (current === target && convergenceAttempt === null) {
          convergenceAttempt = attempts
        }
        break
      }
    }

    if (!foundSmaller) break
  }

  return { final: current, attempts, convergenceAttempt }
}

// Binary search: deterministic O(log N) convergence
function binarySearchShrink(
  start: number,
  target: number,
  budget: number,
  _rng: () => number  // Not used for binary search
): { final: number; attempts: number; convergenceAttempt: number | null } {
  let current = start
  let lower = target
  let attempts = 0
  let convergenceAttempt: number | null = null

  while (attempts < budget && current > target) {
    const mid = Math.floor((lower + current) / 2)

    if (mid === current) {
      // Can't shrink further in this direction
      break
    }

    attempts++

    if (propertyFails(mid, target)) {
      // Property still fails at mid, accept the shrink
      current = mid
      if (current === target && convergenceAttempt === null) {
        convergenceAttempt = attempts
      }
      // Next iteration will try [lower, mid]
    } else {
      // Property passes at mid, search higher
      lower = mid + 1
      // Next iteration will try [mid+1, current]
    }
  }

  return { final: current, attempts, convergenceAttempt }
}

function createRng(seed: number): () => number {
  // Simple seeded PRNG (mulberry32)
  let state = seed
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function runTrial(
  params: ShrinkSimulationParams,
  trialId: number
): ShrinkSimulationResult {
  const { algorithm, startValue, targetValue, budget } = params
  const seed = getSeed(trialId)
  const rng = createRng(seed)

  let result: { final: number; attempts: number; convergenceAttempt: number | null }

  switch (algorithm) {
    case 'random-100':
      result = randomSamplingShrink(startValue, targetValue, budget, rng)
      break
    case 'random-weighted':
      result = weightedSamplingShrink(startValue, targetValue, budget, rng)
      break
    case 'binary-search':
      result = binarySearchShrink(startValue, targetValue, budget, rng)
      break
  }

  return {
    trialId,
    seed,
    algorithm,
    startValue,
    targetValue,
    budget,
    finalValue: result.final,
    distance: result.final - targetValue,
    attemptsUsed: result.attempts,
    converged: result.final === targetValue,
    convergenceAttempt: result.convergenceAttempt
  }
}

async function runLazyShrinkingSimulationStudy(): Promise<void> {
  const algorithms: ('random-100' | 'random-weighted' | 'binary-search')[] = [
    'random-100',
    'random-weighted',
    'binary-search'
  ]

  // Test different shrink distances
  const scenarios: { start: number; target: number }[] = [
    { start: 100, target: 10 },         // Small range: ~90 steps
    { start: 10000, target: 10 },       // Medium range: ~10K steps
    { start: 10_000_000, target: 10 },  // Large range: ~10M steps (main case)
  ]

  // Budget levels
  const budgets: number[] = [20, 50, 100, 200, 500]

  // Generate all combinations
  const parameters: ShrinkSimulationParams[] = []
  for (const algorithm of algorithms) {
    for (const scenario of scenarios) {
      for (const budget of budgets) {
        parameters.push({
          algorithm,
          startValue: scenario.start,
          targetValue: scenario.target,
          budget
        })
      }
    }
  }

  const runner = new ExperimentRunner<ShrinkSimulationParams, ShrinkSimulationResult>({
    name: 'Lazy Shrinking Simulation Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/lazy-shrinking-simulation.csv'),
    csvHeader: [
      'trial_id', 'seed', 'algorithm', 'start_value', 'target_value', 'budget',
      'final_value', 'distance', 'attempts_used', 'converged', 'convergence_attempt'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: ShrinkSimulationResult) => [
      r.trialId, r.seed, r.algorithm, r.startValue, r.targetValue, r.budget,
      r.finalValue, r.distance, r.attemptsUsed, r.converged ? 1 : 0, r.convergenceAttempt ?? ''
    ],
    preRunInfo: () => {
      console.log('Simulating shrinking algorithms:\n')
      console.log('Algorithms:')
      console.log('  - random-100: Current approach (sample 100 random candidates)')
      console.log('  - random-weighted: Current with 80/20 weighting')
      console.log('  - binary-search: Proposed lazy iterator with feedback\n')
      console.log('Scenarios:')
      for (const s of scenarios) {
        const steps = Math.ceil(Math.log2(s.start - s.target))
        console.log(`  - ${s.start} → ${s.target}: ~${steps} binary search steps needed`)
      }
      console.log(`\nBudget levels: ${budgets.join(', ')} attempts`)
      console.log('\nExpected results:')
      console.log('  - Binary search should converge in O(log N) attempts')
      console.log('  - Random sampling needs many more attempts')
      console.log('  - Weighted sampling is better but still not optimal')
      console.log()
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLazyShrinkingSimulationStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runLazyShrinkingSimulationStudy }
