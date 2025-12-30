import {BetaDistribution} from '../distributions/BetaDistribution.js'

/**
 * Calculates Bayesian confidence that a property holds using Beta distribution posterior.
 *
 * Uses a uniform prior Beta(1, 1) and calculates the posterior probability that the
 * true pass rate exceeds the threshold. After n successes and 0 failures, the posterior
 * is Beta(n+1, 1), and confidence = 1 - P(p <= threshold | data).
 *
 * @param successes - Number of successful test cases (where property held)
 * @param failures - Number of failed test cases (where property did not hold)
 * @param threshold - Threshold for true pass rate (default 0.999, meaning 99.9% pass rate)
 * @returns Confidence level (0-1) that property holds with pass rate > threshold
 *
 * @example
 * ```typescript
 * // After 1000 tests with 0 failures
 * const confidence = calculateBayesianConfidence(1000, 0, 0.999)
 * // Returns high confidence (>0.99) that property holds with >99.9% probability
 * ```
 */
export function calculateBayesianConfidence(
  successes: number,
  failures: number,
  threshold = 0.999
): number {
  if (successes < 0 || failures < 0) {
    throw new Error(`Successes and failures must be non-negative, got successes=${successes}, failures=${failures}`)
  }
  if (threshold <= 0 || threshold >= 1) {
    throw new Error(`Threshold must be between 0 and 1, got ${threshold}`)
  }

  // Uniform prior: Beta(1, 1)
  // After successes and failures: Beta(successes + 1, failures + 1)
  const posterior = new BetaDistribution(successes + 1, failures + 1)

  // Confidence = P(p > threshold | data) = 1 - P(p <= threshold | data)
  return 1 - posterior.cdf(threshold)
}

/**
 * Calculates a credible interval for the true pass rate using Beta distribution posterior.
 *
 * Uses a uniform prior Beta(1, 1) and calculates quantiles of the posterior distribution
 * Beta(successes + 1, failures + 1) to form a credible interval.
 *
 * @param successes - Number of successful test cases
 * @param failures - Number of failed test cases
 * @param confidence - Confidence level for the interval (default 0.95 for 95% interval)
 * @returns A tuple [lower, upper] representing the credible interval [0-1]
 *
 * @example
 * ```typescript
 * // After 1000 tests with 0 failures, 95% credible interval
 * const [lower, upper] = calculateCredibleInterval(1000, 0, 0.95)
 * // Returns approximately [0.997, 1.0]
 * ```
 */
export function calculateCredibleInterval(
  successes: number,
  failures: number,
  confidence = 0.95
): [number, number] {
  if (successes < 0 || failures < 0) {
    throw new Error(`Successes and failures must be non-negative, got successes=${successes}, failures=${failures}`)
  }
  if (confidence <= 0 || confidence >= 1) {
    throw new Error(`Confidence level must be between 0 and 1, got ${confidence}`)
  }

  // Uniform prior: Beta(1, 1)
  // After successes and failures: Beta(successes + 1, failures + 1)
  const posterior = new BetaDistribution(successes + 1, failures + 1)

  // For a (1-alpha) credible interval, use quantiles at alpha/2 and 1-alpha/2
  const alpha = 1 - confidence
  const lower = posterior.inv(alpha / 2)
  const upper = posterior.inv(1 - alpha / 2)

  return [lower, upper]
}
