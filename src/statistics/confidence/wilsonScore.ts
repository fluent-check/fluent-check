import jstat from 'jstat'

/**
 * Gets the z-score for a given confidence level.
 * Uses standard normal distribution inverse CDF.
 *
 * @param confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns Z-score for the confidence level
 */
function getZScore(confidence: number): number {
  if (confidence <= 0 || confidence >= 1) {
    throw new Error(`Confidence level must be between 0 and 1, got ${confidence}`)
  }
  // The z-score corresponds to the quantile for p = 1 - (1 - confidence) / 2,
  // which simplifies to (1 + confidence) / 2.
  const p = (1 + confidence) / 2
  return jstat.normal.inv(p, 0, 1)
}

/**
 * Calculates the Wilson score confidence interval for a proportion.
 *
 * The Wilson score interval is better than normal approximation for extreme values
 * and works well even for small sample sizes.
 *
 * @param successes - Number of successful trials
 * @param trials - Total number of trials
 * @param confidence - Confidence level (default 0.95 for 95% confidence)
 * @returns A tuple [lower, upper] representing the confidence interval
 *
 * @example
 * ```typescript
 * // 95% confidence interval for 50 successes out of 100 trials
 * const [lower, upper] = wilsonScoreInterval(50, 100, 0.95)
 * // Returns approximately [0.40, 0.60]
 * ```
 */
export function wilsonScoreInterval(
  successes: number,
  trials: number,
  confidence = 0.95
): [number, number] {
  if (trials === 0) {
    return [0, 1]
  }

  const z = getZScore(confidence)
  const p = successes / trials
  const denominator = 1 + (z * z) / trials
  const center = (p + (z * z) / (2 * trials)) / denominator
  const margin = z / denominator * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))

  return [Math.max(0, center - margin), Math.min(1, center + margin)]
}
