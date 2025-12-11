import jstat from 'jstat'

/**
 * A probability distribution (https://en.wikipedia.org/wiki/Probability_distribution).
 */
export abstract class Distribution {
  abstract mean(): number
  abstract mode(): number
  abstract pdf(x: number): number
  abstract cdf(x: number): number
  abstract inv(p: number): number
}

/**
 * A discrete probability distribution where the support is a contiguous set of integers.
 */
export abstract class IntegerDistribution extends Distribution {
  abstract supportMin(): number
  abstract supportMax(): number

  // Default implementation is O(n) on the support size
  mean(): number {
    let avg = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      avg += k * this.pdf(k)
    }
    return avg
  }

  // Default implementation is O(n) on the support size. Can be made better if distribution is
  // known to be unimodal
  mode(): number {
    let max = NaN, maxP = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      const p = this.pdf(k)
      if (p > maxP) { max = k; maxP = p }
    }
    return max
  }

  // Default implementation is O(n * pdf), where `pdf` is the time complexity of pdf(k)
  cdf(k: number): number {
    if (k < this.supportMin()) return 0.0
    if (k >= this.supportMax()) return 1.0
    let sum = 0
    for (let k2 = this.supportMin(); k2 <= k; k2++) {
      sum += this.pdf(k2)
    }
    return sum
  }

  // Default implementation is O(log(n) * cdf), where `cdf` is the time complexity of cdf(k)
  inv(p: number): number {
    let low = this.supportMin(), high = this.supportMax()
    while (low < high) {
      const mid = Math.floor((high + low) / 2)
      if (this.cdf(mid) >= p) high = mid
      else low = mid + 1
    }
    return low
  }
}

/**
 * A beta distribution (https://en.wikipedia.org/wiki/Beta_distribution).
 */
export class BetaDistribution extends Distribution {
  constructor(public alpha: number, public beta: number) {
    super()
  }

  mean(): number { return jstat.beta.mean(this.alpha, this.beta) }
  mode(): number { return jstat.beta.mode(this.alpha, this.beta) }
  pdf(x: number): number { return jstat.beta.pdf(x, this.alpha, this.beta) }
  cdf(x: number): number { return jstat.beta.cdf(x, this.alpha, this.beta) }
  inv(x: number): number { return jstat.beta.inv(x, this.alpha, this.beta) }
}

/**
 * A beta-binomial distribution (https://en.wikipedia.org/wiki/Beta-binomial_distribution).
 */
export class BetaBinomialDistribution extends IntegerDistribution {
  constructor(public trials: number, public alpha: number, public beta: number) { super() }

  pdf(x: number): number { return Math.exp(this.#logPdf(x)) }
  supportMin(): number { return 0 }
  supportMax(): number { return this.trials }

  override mean(): number { return this.trials * this.alpha / (this.alpha + this.beta) }

  override mode(): number {
    if (this.alpha <= 1.0 || this.beta <= 1.0) {
      return this.beta >= this.alpha ? 0 : this.trials
    }
    // for alpha > 1 && beta > 1 this is an approximation
    return Math.round(this.trials * (this.alpha - 1.0) / (this.alpha + this.beta - 2.0))
  }

  // TODO: implement efficient calculation of CDF (currently O(trials))
  // cdf(k: number): number

  #logPdf(x: number) {
    return this.#combinationln(this.trials, x) +
      this.#betaln(x + this.alpha, this.trials - x + this.beta) -
      this.#betaln(this.alpha, this.beta)
  }

  // Helper functions since jstat's API changed
  #combinationln(n: number, k: number): number {
    return this.#factorialln(n) - this.#factorialln(k) - this.#factorialln(n - k)
  }

  #betaln(a: number, b: number): number {
    return jstat.gammaln(a) + jstat.gammaln(b) - jstat.gammaln(a + b)
  }

  #factorialln(n: number): number {
    return jstat.gammaln(n + 1)
  }
}

export const factorial = (n: number) => {
  let x = 1, f = 1
  while (x <= n) f *= x++
  return f
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

  if (successes === 0) {
    // Special case: no successes
    const z = getZScore(confidence)
    const denominator = 1 + (z * z) / trials
    const center = (z * z) / (2 * trials) / denominator
    const margin = z / denominator * Math.sqrt((z * z) / (4 * trials))
    return [Math.max(0, center - margin), Math.min(1, center + margin)]
  }

  if (successes === trials) {
    // Special case: all successes
    const z = getZScore(confidence)
    const denominator = 1 + (z * z) / trials
    const center = (successes + z * z / 2) / (trials + z * z) / denominator
    const margin = z / denominator * Math.sqrt((successes * (trials - successes)) / trials + (z * z) / 4)
    return [Math.max(0, center - margin), Math.min(1, center + margin)]
  }

  // Standard Wilson score interval
  const z = getZScore(confidence)
  const p = successes / trials
  const denominator = 1 + (z * z) / trials
  const center = (p + (z * z) / (2 * trials)) / denominator
  const margin = z / denominator * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))

  return [Math.max(0, center - margin), Math.min(1, center + margin)]
}

/**
 * Gets the z-score for a given confidence level.
 * Uses standard normal distribution critical values.
 *
 * @param confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns Z-score for the confidence level
 */
function getZScore(confidence: number): number {
  // Common confidence levels and their z-scores
  const zScores: Record<number, number> = {
    0.80: 1.2816,
    0.85: 1.4395,
    0.90: 1.6449,
    0.95: 1.9600,
    0.99: 2.5758,
    0.999: 3.2905
  }

  const exactZ = zScores[confidence]
  if (exactZ !== undefined) {
    return exactZ
  }

  // For other confidence levels, use approximation
  // This is a simplified approximation - for production, consider using jstat
  if (confidence < 0.5 || confidence >= 1.0) {
    throw new Error(`Confidence level must be between 0.5 and 1.0, got ${confidence}`)
  }

  // Use jstat for more accurate z-scores if available
  // For now, linear interpolation between known values
  const sortedLevels = Object.keys(zScores).map(Number).sort((a, b) => a - b)
  const lower = sortedLevels.filter(level => level <= confidence).pop() ?? 0.90
  const upper = sortedLevels.filter(level => level >= confidence).shift() ?? 0.95

  if (lower === upper) {
    const z = zScores[lower]
    if (z === undefined) {
      throw new Error(`Invalid confidence level: ${confidence}`)
    }
    return z
  }

  // Linear interpolation
  const lowerZ = zScores[lower]
  const upperZ = zScores[upper]
  if (lowerZ === undefined || upperZ === undefined) {
    throw new Error(`Invalid confidence level: ${confidence}`)
  }
  const ratio = (confidence - lower) / (upper - lower)
  return lowerZ + (upperZ - lowerZ) * ratio
}

/**
 * Coverage verification result for a single coverage requirement.
 */
export interface CoverageResult {
  /** The label being verified */
  label: string
  /** The minimum required percentage (0-100) */
  requiredPercentage: number
  /** The actual observed percentage (0-100) */
  observedPercentage: number
  /** Whether the requirement was satisfied */
  satisfied: boolean
  /** Wilson score confidence interval for observed percentage */
  confidenceInterval: [number, number]
  /** The confidence level used (default 0.95) */
  confidence: number
}

/**
 * Basic execution statistics for property-based tests.
 */
export interface FluentStatistics {
  /** Total test cases executed */
  testsRun: number
  /** Test cases that passed (where the property held) */
  testsPassed: number
  /** Test cases filtered by preconditions */
  testsDiscarded: number
  /** Total execution time in milliseconds */
  executionTimeMs: number
  /** Label counts for test case classifications (optional) */
  labels?: Record<string, number>
  /** Label percentages (0-100) for test case classifications (optional) */
  labelPercentages?: Record<string, number>
  /** Coverage verification results (optional) */
  coverageResults?: CoverageResult[]
}
