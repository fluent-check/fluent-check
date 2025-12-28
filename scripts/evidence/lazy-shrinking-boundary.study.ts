/**
 * Lazy Shrinking Boundary Study
 *
 * This study correctly models the shrinking problem: we're looking for the
 * SMALLEST value that still FAILS the property.
 *
 * Key insight: The property defines a boundary. Values below the boundary PASS,
 * values at or above the boundary FAIL. We want to find the boundary.
 *
 * For property: value >= threshold (fails when >= threshold)
 * - Values 0 to threshold-1: PASS (property satisfied)
 * - Values threshold to max: FAIL (counterexamples)
 * - Optimal shrunk value: threshold (smallest that still fails)
 *
 * The challenge: Random sampling from [0, current] will often hit values
 * below threshold (which PASS), so we reject those and try again.
 * Binary search systematically finds the boundary.
 *
 * This is the REAL problem the 100-pick limit creates: when the optimal
 * is NOT at 0, random sampling toward 0 often overshoots.
 */

import { ExperimentRunner, getSeed, getSampleSize } from './runner.js'
import path from 'path'

interface BoundaryShrinkResult {
  trialId: number
  seed: number
  algorithm: 'random-100' | 'random-weighted' | 'binary-search'
  startValue: number
  threshold: number  // The boundary - smallest failing value
  budget: number
  finalValue: number
  distance: number  // Distance from threshold (optimal)
  attemptsUsed: number
  converged: boolean
  rejections: number  // How many candidates were rejected (passed the property)
}

interface BoundaryShrinkParams {
  algorithm: 'random-100' | 'random-weighted' | 'binary-search'
  startValue: number
  threshold: number
  budget: number
}

// Property: fails when value >= threshold
// We want to shrink to the smallest failing value (threshold)
function propertyFails(value: number, threshold: number): boolean {
  return value >= threshold
}

function createRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Random sampling toward 0 (current behavior)
// Problem: if threshold > 0, many candidates will be < threshold and PASS
function randomSamplingShrink(
  start: number,
  threshold: number,
  budget: number,
  rng: () => number
): { final: number; attempts: number; rejections: number } {
  let current = start
  let attempts = 0
  let rejections = 0
  const target = 0  // Always shrink toward 0

  while (attempts < budget && current > threshold) {
    // Sample up to 100 candidates from [0, current-1]
    const sampleSize = Math.min(100, budget - attempts)
    const candidates: number[] = []

    for (let i = 0; i < sampleSize; i++) {
      if (current > target) {
        // Random value in [0, current - 1]
        const candidate = Math.floor(rng() * current)
        candidates.push(candidate)
      }
    }

    // Sort to try smaller values first
    candidates.sort((a, b) => a - b)

    let foundSmaller = false
    for (const candidate of candidates) {
      attempts++
      if (propertyFails(candidate, threshold)) {
        // Property still fails, accept shrink
        current = candidate
        foundSmaller = true
        break
      } else {
        // Property passes (value too small), reject
        rejections++
      }
    }

    if (!foundSmaller) break
  }

  return { final: current, attempts, rejections }
}

// Weighted 80/20 sampling (current improvement)
function weightedSamplingShrink(
  start: number,
  threshold: number,
  budget: number,
  rng: () => number
): { final: number; attempts: number; rejections: number } {
  let current = start
  let attempts = 0
  let rejections = 0
  const target = 0

  while (attempts < budget && current > threshold) {
    const sampleSize = Math.min(100, budget - attempts)
    const candidates: number[] = []
    const mid = Math.floor(current / 2)

    for (let i = 0; i < sampleSize; i++) {
      if (current <= target) break

      if (rng() < 0.8 && mid >= 0) {
        // 80% from smaller half [0, mid]
        const candidate = Math.floor(rng() * (mid + 1))
        candidates.push(candidate)
      } else if (mid + 1 < current) {
        // 20% from larger half [mid+1, current-1]
        const candidate = mid + 1 + Math.floor(rng() * (current - mid - 1))
        candidates.push(candidate)
      }
    }

    candidates.sort((a, b) => a - b)

    let foundSmaller = false
    for (const candidate of candidates) {
      attempts++
      if (propertyFails(candidate, threshold)) {
        current = candidate
        foundSmaller = true
        break
      } else {
        rejections++
      }
    }

    if (!foundSmaller) break
  }

  return { final: current, attempts, rejections }
}

// Binary search with feedback - finds boundary efficiently
function binarySearchShrink(
  start: number,
  threshold: number,
  budget: number,
  _rng: () => number
): { final: number; attempts: number; rejections: number } {
  let current = start
  let lower = 0  // Shrink toward 0
  let attempts = 0
  let rejections = 0

  while (attempts < budget && lower < current) {
    const mid = Math.floor((lower + current) / 2)

    if (mid === current) break

    attempts++

    if (propertyFails(mid, threshold)) {
      // Property fails at mid, we can shrink to mid
      current = mid
      // Continue searching in [lower, mid] for even smaller
    } else {
      // Property passes at mid, boundary is above mid
      lower = mid + 1
      rejections++
      // Continue searching in [mid+1, current]
    }
  }

  return { final: current, attempts, rejections }
}

function runTrial(
  params: BoundaryShrinkParams,
  trialId: number
): BoundaryShrinkResult {
  const { algorithm, startValue, threshold, budget } = params
  const seed = getSeed(trialId)
  const rng = createRng(seed)

  let result: { final: number; attempts: number; rejections: number }

  switch (algorithm) {
    case 'random-100':
      result = randomSamplingShrink(startValue, threshold, budget, rng)
      break
    case 'random-weighted':
      result = weightedSamplingShrink(startValue, threshold, budget, rng)
      break
    case 'binary-search':
      result = binarySearchShrink(startValue, threshold, budget, rng)
      break
  }

  return {
    trialId,
    seed,
    algorithm,
    startValue,
    threshold,
    budget,
    finalValue: result.final,
    distance: result.final - threshold,
    attemptsUsed: result.attempts,
    converged: result.final === threshold,
    rejections: result.rejections
  }
}

async function runBoundaryShrinkStudy(): Promise<void> {
  const algorithms: ('random-100' | 'random-weighted' | 'binary-search')[] = [
    'random-100',
    'random-weighted',
    'binary-search'
  ]

  // Different scenarios: varying threshold positions
  // The key is threshold NOT at 0 - this is where random sampling fails
  const scenarios: { start: number; threshold: number }[] = [
    // Threshold at 10 (like the shrinking study)
    { start: 100, threshold: 10 },
    { start: 10_000, threshold: 10 },
    { start: 10_000_000, threshold: 10 },

    // Threshold at 1000 (boundary further from 0)
    { start: 10_000, threshold: 1000 },
    { start: 10_000_000, threshold: 1000 },

    // Threshold at 100000 (very far from 0)
    { start: 10_000_000, threshold: 100_000 },
  ]

  const budgets: number[] = [20, 50, 100, 200, 500, 1000]

  const parameters: BoundaryShrinkParams[] = []
  for (const algorithm of algorithms) {
    for (const scenario of scenarios) {
      for (const budget of budgets) {
        parameters.push({
          algorithm,
          startValue: scenario.start,
          threshold: scenario.threshold,
          budget
        })
      }
    }
  }

  const runner = new ExperimentRunner<BoundaryShrinkParams, BoundaryShrinkResult>({
    name: 'Lazy Shrinking Boundary Study',
    outputPath: path.join(process.cwd(), 'docs/evidence/raw/lazy-shrinking-boundary.csv'),
    csvHeader: [
      'trial_id', 'seed', 'algorithm', 'start_value', 'threshold', 'budget',
      'final_value', 'distance', 'attempts_used', 'converged', 'rejections'
    ],
    trialsPerConfig: getSampleSize(500, 100),
    resultToRow: (r: BoundaryShrinkResult) => [
      r.trialId, r.seed, r.algorithm, r.startValue, r.threshold, r.budget,
      r.finalValue, r.distance, r.attemptsUsed, r.converged ? 1 : 0, r.rejections
    ],
    preRunInfo: () => {
      console.log('Simulating shrinking with property boundaries:\n')
      console.log('Algorithms:')
      console.log('  - random-100: Current (sample toward 0, reject if passes)')
      console.log('  - random-weighted: 80/20 weighted sampling')
      console.log('  - binary-search: Feedback-driven boundary finding\n')
      console.log('Property: value >= threshold (fails when >= threshold)')
      console.log('Goal: Find smallest failing value (the threshold)\n')
      console.log('Scenarios:')
      for (const s of scenarios) {
        const range = s.start - s.threshold
        const rejectRatio = s.threshold / s.start * 100
        console.log(`  - ${s.start} → ${s.threshold}: ~${rejectRatio.toFixed(1)}% of [0,start] passes (rejected)`)
      }
      console.log(`\nBudget levels: ${budgets.join(', ')} attempts`)
      console.log('\nKey insight: Higher threshold = more rejections for random sampling')
      console.log()
    }
  })

  await runner.run(parameters, (p, id, idx) => runTrial(p, id, idx))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBoundaryShrinkStudy()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { runBoundaryShrinkStudy }
