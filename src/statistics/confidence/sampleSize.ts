import {calculateBayesianConfidence} from './bayesianConfidence.js'

/**
 * Calculates the minimum number of tests required to achieve a target confidence level
 * that the true pass rate exceeds a given threshold, assuming zero failures.
 *
 * Uses binary search to find the smallest n where:
 * P(p > threshold | n successes, 0 failures) >= targetConfidence
 *
 * @param threshold - Pass rate threshold (0 < threshold < 1), e.g., 0.999 for 99.9%
 * @param targetConfidence - Target confidence level (0 < targetConfidence < 1), e.g., 0.95 for 95%
 * @returns Minimum number of tests required (assuming all pass)
 *
 * @example
 * ```typescript
 * // How many tests to be 95% confident pass rate > 99.9%?
 * const n = sampleSizeForConfidence(0.999, 0.95)
 * // Returns approximately 2995
 * ```
 */
export function sampleSizeForConfidence(
  threshold: number,
  targetConfidence: number
): number {
  if (threshold <= 0 || threshold >= 1) {
    throw new Error(`Threshold must be between 0 and 1, got ${threshold}`)
  }
  if (targetConfidence <= 0 || targetConfidence >= 1) {
    throw new Error(`Target confidence must be between 0 and 1, got ${targetConfidence}`)
  }

  // Binary search for minimum n
  let low = 1
  let high = 100000 // Upper bound - should be sufficient for any practical use

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const confidence = calculateBayesianConfidence(mid, 0, threshold)

    if (confidence >= targetConfidence) {
      high = mid
    } else {
      low = mid + 1
    }
  }

  return low
}

/**
 * Calculates the expected number of tests to detect the first failure,
 * given a known failure rate.
 *
 * Based on geometric distribution: E[X] = 1/p where p is the failure probability.
 *
 * @param failureRate - Probability of failure per test (0 < failureRate <= 1)
 * @returns Expected number of tests until first failure
 *
 * @example
 * ```typescript
 * // Expected tests to find a bug that occurs 1 in 1000 times
 * const n = expectedTestsToDetectFailure(0.001)
 * // Returns 1000
 * ```
 */
export function expectedTestsToDetectFailure(failureRate: number): number {
  if (failureRate <= 0 || failureRate > 1) {
    throw new Error(`Failure rate must be between 0 (exclusive) and 1 (inclusive), got ${failureRate}`)
  }
  return 1 / failureRate
}

/**
 * Calculates the probability of detecting at least one failure in n tests,
 * given a known failure rate.
 *
 * Based on: P(at least one failure) = 1 - (1 - failureRate)^n
 *
 * @param failureRate - Probability of failure per test (0 < failureRate <= 1)
 * @param tests - Number of tests to run
 * @returns Probability of detecting at least one failure
 *
 * @example
 * ```typescript
 * // Probability of finding a 0.1% bug in 1000 tests
 * const p = detectionProbability(0.001, 1000)
 * // Returns approximately 0.632
 * ```
 */
export function detectionProbability(failureRate: number, tests: number): number {
  if (failureRate <= 0 || failureRate > 1) {
    throw new Error(`Failure rate must be between 0 (exclusive) and 1 (inclusive), got ${failureRate}`)
  }
  if (tests < 0 || !Number.isInteger(tests)) {
    throw new Error(`Tests must be a non-negative integer, got ${tests}`)
  }
  return 1 - Math.pow(1 - failureRate, tests)
}
