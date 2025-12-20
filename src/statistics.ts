import jstat from 'jstat'
import {AsyncLocalStorage} from 'node:async_hooks'
import {stringify} from './arbitraries/util.js'

export const factorial = jstat.factorial

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
    // Use gammaln for numerical stability with large trials (>170 would overflow factorial)
    const logCombination = jstat.gammaln(this.trials + 1) - jstat.gammaln(x + 1) - jstat.gammaln(this.trials - x + 1)
    return logCombination +
      this.#betaln(x + this.alpha, this.trials - x + this.beta) -
      this.#betaln(this.alpha, this.beta)
  }

  #betaln(a: number, b: number): number {
    return jstat.gammaln(a) + jstat.gammaln(b) - jstat.gammaln(a + b)
  }
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
 * Verbosity levels for test output.
 */
export enum Verbosity {
  /** No output except thrown errors */
  Quiet = 0,
  /** Default; counterexamples and coverage failures only */
  Normal = 1,
  /** Progress updates, statistics summary, and all classifications */
  Verbose = 2,
  /** All verbose output plus internal state and generation details */
  Debug = 3
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

export interface Logger {
  log: (entry: LogEntry) => void
}

/**
 * Statistics for a single arbitrary's generated values.
 */
export interface ArbitraryStatistics {
  /**
   * Number of values generated for this arbitrary.
   * Note: This counts all samples generated during traversal, which may be
   * higher than testsRun when preconditions filter samples. For nested quantifiers,
   * this reflects the actual sampling frequency (inner quantifiers may have higher counts).
   */
  samplesGenerated: number
  /** Number of distinct values generated */
  uniqueValues: number
  /** Corner cases that were tested */
  cornerCases: {
    /** Array of corner case values that were generated */
    tested: unknown[]
    /** Total number of corner cases available for this arbitrary */
    total: number
  }
  /** Distribution statistics for numeric arbitraries (optional) */
  distribution?: DistributionStatistics
  /** Histogram bins for numeric arbitraries (optional) */
  distributionHistogram?: HistogramBin[]
  /** Array length statistics for array arbitraries (optional) */
  arrayLengths?: LengthStatistics
  /** Histogram bins for array lengths (optional) */
  arrayLengthHistogram?: HistogramBin[]
  /** String length statistics for string arbitraries (optional) */
  stringLengths?: LengthStatistics
  /** Histogram bins for string lengths (optional) */
  stringLengthHistogram?: HistogramBin[]
}

/**
 * Distribution statistics for numeric values.
 */
export interface DistributionStatistics {
  /** Minimum value generated */
  min: number
  /** Maximum value generated */
  max: number
  /** Arithmetic mean of generated values */
  mean: number
  /** Estimated median value (50th percentile) */
  median: number
  /** Estimated first quartile (25th percentile) */
  q1: number
  /** Estimated third quartile (75th percentile) */
  q3: number
  /** Sample standard deviation */
  stdDev: number
  /** Number of observations */
  count: number
}

/**
 * Length statistics for arrays or strings (subset of DistributionStatistics).
 */
export type LengthStatistics = Pick<DistributionStatistics, 'min' | 'max' | 'mean' | 'median' | 'count'>

/**
 * Histogram bin representation for formatted output.
 */
export interface HistogramBin {
  label: string
  start: number
  end: number
  count: number
  percentage: number
}

/**
 * Statistics for target observations.
 */
export interface TargetStatistics {
  /** The maximum observation value seen */
  best: number
  /** Number of observations recorded */
  observations: number
  /** Mean of all observations */
  mean: number
}

/**
 * Statistics for shrinking operations.
 */
export interface ShrinkingStatistics {
  /** Number of shrink candidates evaluated */
  candidatesTested: number
  /** Number of shrinking iterations completed */
  roundsCompleted: number
  /** Number of times a smaller counterexample was found */
  improvementsMade: number
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
  /** Breakdown of execution time by phase (optional) */
  executionTimeBreakdown?: {
    exploration: number
    shrinking: number
  }
  /** Label counts for test case classifications (optional) */
  labels?: Record<string, number>
  /** Label percentages (0-100) for test case classifications (optional) */
  labelPercentages?: Record<string, number>
  /** Coverage verification results (optional) */
  coverageResults?: CoverageResult[]
  /** Per-arbitrary statistics (optional, requires withDetailedStatistics()) */
  arbitraryStats?: Record<string, ArbitraryStatistics>
  /** Event counts (optional, tracked when fc.event() is used) */
  events?: Record<string, number>
  /** Event percentages (0-100) (optional, tracked when fc.event() is used) */
  eventPercentages?: Record<string, number>
  /** Target statistics (optional, tracked when fc.target() is used) */
  targets?: Record<string, TargetStatistics>
  /** Shrinking statistics (optional) */
  shrinking?: ShrinkingStatistics
  /** Bayesian confidence that property holds (0-1, optional) */
  confidence?: number
  /** 95% credible interval for true pass rate [lower, upper] (optional) */
  credibleInterval?: [number, number]
}

/**
 * Streaming mean and variance calculator using Welford's online algorithm.
 * O(1) memory, numerically stable.
 */
export class StreamingMeanVariance {
  private count = 0
  private mean = 0
  private m2 = 0 // Sum of squares of differences from mean

  /**
   * Add a value to the stream.
   */
  add(value: number): void {
    this.count++
    const delta = value - this.mean
    this.mean += delta / this.count
    const delta2 = value - this.mean
    this.m2 += delta * delta2
  }

  /**
   * Get the current mean.
   */
  getMean(): number {
    return this.mean
  }

  /**
   * Get the current variance (population variance).
   */
  getVariance(): number {
    if (this.count < 2) return 0
    return this.m2 / this.count
  }

  /**
   * Get the current sample variance (Bessel's correction).
   */
  getSampleVariance(): number {
    if (this.count < 2) return 0
    return this.m2 / (this.count - 1)
  }

  /**
   * Get the current standard deviation (sample).
   */
  getStdDev(): number {
    return Math.sqrt(this.getSampleVariance())
  }

  /**
   * Get the number of values added.
   */
  getCount(): number {
    return this.count
  }

  /**
   * Reset the calculator.
   */
  reset(): void {
    this.count = 0
    this.mean = 0
    this.m2 = 0
  }
}

/**
 * Streaming min/max tracker.
 * O(1) memory.
 */
export class StreamingMinMax {
  private min: number | undefined = undefined
  private max: number | undefined = undefined

  /**
   * Add a value to the stream.
   */
  add(value: number): void {
    if (this.min === undefined || value < this.min) {
      this.min = value
    }
    if (this.max === undefined || value > this.max) {
      this.max = value
    }
  }

  /**
   * Get the minimum value seen.
   */
  getMin(): number | undefined {
    return this.min
  }

  /**
   * Get the maximum value seen.
   */
  getMax(): number | undefined {
    return this.max
  }

  /**
   * Reset the tracker.
   */
  reset(): void {
    this.min = undefined
    this.max = undefined
  }
}

/**
 * Default buffer sizes for quantile estimation and histogram sampling.
 */
export const DEFAULT_QUANTILE_BUFFER_SIZE = 100
export const DEFAULT_HISTOGRAM_SAMPLE_SIZE = 200
export const DEFAULT_HISTOGRAM_BINS = 10

/**
 * Streaming quantile estimator using the P² algorithm for q1/median/q3 with
 * an initial exact phase. Maintains a bounded reservoir for histogram output.
 */
export class StreamingQuantiles {
  private readonly probs = [0, 0.25, 0.5, 0.75, 1]
  private readonly dn = [0, 0.25, 0.5, 0.75, 1]
  private count = 0
  private readonly initial: number[] = []
  private q: number[] = []
  private n: number[] = []
  private np: number[] = []
  private readonly reservoir: number[] = []
  private readonly reservoirSize: number

  constructor(reservoirSize = DEFAULT_HISTOGRAM_SAMPLE_SIZE) {
    this.reservoirSize = reservoirSize
  }

  add(value: number): void {
    this.count++
    this.addToReservoir(value)

    if (this.count <= 5) {
      this.initial.push(value)
      if (this.count === 5) {
        this.initial.sort((a, b) => a - b)
        this.q = [...this.initial]
        this.n = [1, 2, 3, 4, 5]
        this.np = this.probs.map(p => 1 + p * (this.count - 1))
      }
      return
    }

    let k: number
    if (value < this.q[0]!) {
      this.q[0] = value
      k = 0
    } else if (value >= this.q[4]!) {
      this.q[4] = value
      k = 3
    } else {
      k = 0
      while (k < 3 && value >= this.q[k + 1]!) k++
    }

    for (let i = k + 1; i < 5; i++) {
      this.n[i]! += 1
    }
    for (let i = 0; i < 5; i++) {
      this.np[i]! += this.dn[i]!
    }

    for (let i = 1; i <= 3; i++) {
      const d = this.np[i]! - this.n[i]!
      const di = Math.sign(d)
      if (di !== 0 && this.canAdjustMarker(i, di)) {
        const qNew = this.parabolic(i, di)
        if (qNew > this.q[i - 1]! && qNew < this.q[i + 1]!) {
          this.q[i] = qNew
        } else {
          this.q[i] = this.linear(i, di)
        }
        this.n[i]! += di
      }
    }
  }

  getQuantile(p: number): number {
    if (p < 0 || p > 1) {
      throw new Error(`Quantile must be between 0 and 1, got ${p}`)
    }
    if (this.count === 0) return NaN
    if (this.count <= 5) {
      const values = [...this.initial].sort((a, b) => a - b)
      const index = p * (values.length - 1)
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      if (lower === upper) return values[lower]!
      const weight = index - lower
      return values[lower]! * (1 - weight) + values[upper]! * weight
    }

    if (p <= 0) return this.q[0]!
    if (p >= 1) return this.q[4]!

    const idx = this.probs.findIndex(prob => prob >= p)
    if (idx === -1 || idx === 0) return this.q[0]!
    const lowerProb = this.probs[idx - 1]!
    const upperProb = this.probs[idx]!
    const lowerQ = this.q[idx - 1]!
    const upperQ = this.q[idx]!
    const weight = (p - lowerProb) / (upperProb - lowerProb)
    return lowerQ * (1 - weight) + upperQ * weight
  }

  getMedian(): number {
    return this.getQuantile(0.5)
  }

  getQ1(): number {
    return this.getQuantile(0.25)
  }

  getQ3(): number {
    return this.getQuantile(0.75)
  }

  getCount(): number {
    return this.count
  }

  getSampleValues(): number[] {
    return [...this.reservoir]
  }

  reset(): void {
    this.count = 0
    this.initial.length = 0
    this.q.length = 0
    this.n.length = 0
    this.np.length = 0
    this.reservoir.length = 0
  }

  private canAdjustMarker(i: number, di: number): boolean {
    const forwardGap = this.n[i + 1]! - this.n[i]!
    const backwardGap = this.n[i - 1]! - this.n[i]!
    return (di > 0 && forwardGap > 1) || (di < 0 && backwardGap < -1)
  }

  private parabolic(i: number, di: number): number {
    const qi = this.q[i]!
    const qiPlus = this.q[i + 1]!
    const qiMinus = this.q[i - 1]!
    const niPlus = this.n[i + 1]!
    const ni = this.n[i]!
    const niMinus = this.n[i - 1]!

    const numerator =
      di * (ni - niMinus + di) * (qiPlus - qi) / (niPlus - ni) +
      di * (niPlus - ni - di) * (qi - qiMinus) / (ni - niMinus)

    const denominator = niPlus - niMinus
    if (denominator === 0) {
      return qi
    }
    return qi + numerator / denominator
  }

  private linear(i: number, di: number): number {
    const nextIndex = i + di
    const deltaN = this.n[nextIndex]! - this.n[i]!
    if (deltaN === 0) return this.q[i]!
    return this.q[i]! + di * (this.q[nextIndex]! - this.q[i]!) / deltaN
  }

  private addToReservoir(value: number): void {
    if (this.reservoir.length < this.reservoirSize) {
      this.reservoir.push(value)
      return
    }

    const idx = Math.floor(Math.random() * this.count)
    if (idx < this.reservoirSize) {
      this.reservoir[idx] = value
    }
  }
}

/**
 * Distribution tracker combining all streaming algorithms.
 * Provides a single interface for tracking numeric distributions.
 */
export class DistributionTracker {
  private readonly meanVariance: StreamingMeanVariance
  private readonly minMax: StreamingMinMax
  private readonly quantiles: StreamingQuantiles

  constructor(
    maxQuantileBufferSize = DEFAULT_QUANTILE_BUFFER_SIZE,
    private readonly histogramSampleSize = DEFAULT_HISTOGRAM_SAMPLE_SIZE
  ) {
    this.meanVariance = new StreamingMeanVariance()
    this.minMax = new StreamingMinMax()
    this.quantiles = new StreamingQuantiles(Math.max(maxQuantileBufferSize, this.histogramSampleSize))
  }

  /**
   * Add a value to the distribution.
   */
  add(value: number): void {
    this.meanVariance.add(value)
    this.minMax.add(value)
    this.quantiles.add(value)
  }

  /**
   * Get complete distribution statistics.
   */
  getStatistics(): DistributionStatistics {
    const min = this.minMax.getMin()
    const max = this.minMax.getMax()
    const count = this.meanVariance.getCount()

    if (min === undefined || max === undefined || count === 0) {
      throw new Error('Cannot get statistics: no values added')
    }

    return {
      min,
      max,
      mean: this.meanVariance.getMean(),
      median: this.quantiles.getMedian(),
      q1: this.quantiles.getQ1(),
      q3: this.quantiles.getQ3(),
      stdDev: this.meanVariance.getStdDev(),
      count
    }
  }

  getHistogram(binCount = DEFAULT_HISTOGRAM_BINS): HistogramBin[] {
    const samples = this.quantiles.getSampleValues()
    if (samples.length === 0) return []

    const min = Math.min(...samples)
    const max = Math.max(...samples)
    if (min === max) {
      return [{
        label: `${min}`,
        start: min,
        end: max,
        count: samples.length,
        percentage: 100
      }]
    }

    const binSize = (max - min) / binCount
    const bins: HistogramBin[] = []
    for (let i = 0; i < binCount; i++) {
      const start = min + i * binSize
      const end = i === binCount - 1 ? max : start + binSize
      bins.push({label: `${start.toFixed(2)}-${end.toFixed(2)}`, start, end, count: 0, percentage: 0})
    }

    for (const value of samples) {
      let idx = Math.floor((value - min) / binSize)
      if (idx >= binCount) idx = binCount - 1
      bins[idx]!.count += 1
    }

    for (const bin of bins) {
      bin.percentage = (bin.count / samples.length) * 100
    }

    return bins
  }

  /**
   * Get the number of values added.
   */
  getCount(): number {
    return this.meanVariance.getCount()
  }

  /**
   * Reset all trackers.
   */
  reset(): void {
    this.meanVariance.reset()
    this.minMax.reset()
    this.quantiles.reset()
  }
}

/**
 * Interface for arbitrary-like objects passed to statistics collector.
 */
interface ArbitraryLike {
  cornerCases(): unknown[]
  hashCode(): (a: unknown) => number
  equals(): (a: unknown, b: unknown) => boolean
}

/**
 * Extract length statistics from a distribution tracker.
 */
function toLengthStatistics(tracker: DistributionTracker): LengthStatistics {
  const stats = tracker.getStatistics()
  return {
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    median: stats.median,
    count: stats.count
  }
}

/**
 * Collector for per-arbitrary statistics.
 */
export class ArbitraryStatisticsCollector {
  private samplesGenerated = 0
  private readonly uniqueValuesBuckets = new Map<number, unknown[]>()
  private uniqueValuesCount = 0
  private readonly cornerCasesTested: unknown[] = []
  private cornerCasesTotal = 0
  private distributionTracker?: DistributionTracker
  private arrayLengthTracker?: DistributionTracker
  private stringLengthTracker?: DistributionTracker

  /**
   * Record that a sample was generated.
   */
  recordSample(value: unknown, arbitrary: ArbitraryLike): void {
    this.samplesGenerated++

    const hashFn = arbitrary.hashCode()
    const eqFn = arbitrary.equals()
    const h = hashFn(value)

    // Check for existence in bucket
    const bucket = this.uniqueValuesBuckets.get(h)
    const isUnique = bucket === undefined
      ? (this.uniqueValuesBuckets.set(h, [value]), true)
      : !bucket.some(v => eqFn(v, value)) && (bucket.push(value), true)

    if (isUnique) {
      this.uniqueValuesCount++
      this.checkCornerCase(value, arbitrary)
    }
  }

  private checkCornerCase(value: unknown, arbitrary: ArbitraryLike): void {
    const cornerCases = arbitrary.cornerCases()
    this.cornerCasesTotal = cornerCases.length
    const valueStr = stringify(value)

    for (const cornerCase of cornerCases) {
      if (stringify(cornerCase) === valueStr) {
        this.cornerCasesTested.push(value)
        break
      }
    }
  }

  /** Record a numeric value for distribution tracking. */
  recordNumericValue(value: number): void {
    this.distributionTracker ??= new DistributionTracker()
    this.distributionTracker.add(value)
  }

  /** Record an array length value for tracking. */
  recordArrayLength(length: number): void {
    this.arrayLengthTracker ??= new DistributionTracker()
    this.arrayLengthTracker.add(length)
  }

  /** Record a string length value for tracking. */
  recordStringLength(length: number): void {
    this.stringLengthTracker ??= new DistributionTracker()
    this.stringLengthTracker.add(length)
  }

  /** Get the collected statistics. */
  getStatistics(): ArbitraryStatistics {
    const stats: ArbitraryStatistics = {
      samplesGenerated: this.samplesGenerated,
      uniqueValues: this.uniqueValuesCount,
      cornerCases: {tested: this.cornerCasesTested, total: this.cornerCasesTotal}
    }

    if (this.distributionTracker !== undefined && this.distributionTracker.getCount() > 0) {
      stats.distribution = this.distributionTracker.getStatistics()
      const histogram = this.distributionTracker.getHistogram()
      if (histogram.length > 0) {
        stats.distributionHistogram = histogram
      }
    }
    if (this.arrayLengthTracker !== undefined && this.arrayLengthTracker.getCount() > 0) {
      stats.arrayLengths = toLengthStatistics(this.arrayLengthTracker)
      const histogram = this.arrayLengthTracker.getHistogram()
      if (histogram.length > 0) {
        stats.arrayLengthHistogram = histogram
      }
    }
    if (this.stringLengthTracker !== undefined && this.stringLengthTracker.getCount() > 0) {
      stats.stringLengths = toLengthStatistics(this.stringLengthTracker)
      const histogram = this.stringLengthTracker.getHistogram()
      if (histogram.length > 0) {
        stats.stringLengthHistogram = histogram
      }
    }

    return stats
  }

  /** Reset the collector. */
  reset(): void {
    this.samplesGenerated = 0
    this.uniqueValuesBuckets.clear()
    this.uniqueValuesCount = 0
    this.cornerCasesTested.length = 0
    this.cornerCasesTotal = 0
    this.distributionTracker?.reset()
    this.arrayLengthTracker?.reset()
    this.stringLengthTracker?.reset()
  }
}

/**
 * Context for collecting detailed statistics during test execution.
 */
export class StatisticsContext {
  constructor(
    private readonly options: {
      verbosity?: Verbosity
      logger?: Logger
    } = {}
  ) {}

  private readonly arbitraryCollectors = new Map<string, ArbitraryStatisticsCollector>()
  private readonly eventCounts = new Map<string, Set<number>>() // Set of test case indices per event
  private readonly targetTrackers = new Map<string, DistributionTracker>()
  private currentTestCaseIndex = 0

  /**
   * Get or create a collector for a quantifier.
   */
  getCollector(quantifierName: string): ArbitraryStatisticsCollector {
    let collector = this.arbitraryCollectors.get(quantifierName)
    if (collector === undefined) {
      collector = new ArbitraryStatisticsCollector()
      this.arbitraryCollectors.set(quantifierName, collector)
    }
    return collector
  }

  /**
   * Record an event for the current test case.
   */
  recordEvent(name: string, testCaseIndex: number, payload?: unknown): void {
    let testCases = this.eventCounts.get(name)
    if (testCases === undefined) {
      testCases = new Set<number>()
      this.eventCounts.set(name, testCases)
    }
    testCases.add(testCaseIndex)

    if (this.shouldLog(Verbosity.Debug)) {
      this.log('debug', 'event', {name, payload, testCaseIndex})
    }
  }

  /**
   * Record a target observation.
   */
  recordTarget(label: string, observation: number): void {
    let tracker = this.targetTrackers.get(label)
    if (tracker === undefined) {
      tracker = new DistributionTracker()
      this.targetTrackers.set(label, tracker)
    }
    tracker.add(observation)
  }

  /**
   * Set the current test case index (for event deduplication).
   */
  setTestCaseIndex(index: number): void {
    this.currentTestCaseIndex = index
  }

  /**
   * Get the current test case index.
   */
  getTestCaseIndex(): number {
    return this.currentTestCaseIndex
  }

  /**
   * Log an invalid target observation when verbosity allows it.
   */
  logInvalidTarget(label: string, observation: number): void {
    if (!this.shouldLog(Verbosity.Normal)) return
    this.log('warn', 'Invalid target observation ignored', {label, observation})
  }

  /**
   * Get event counts (number of test cases with each event).
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const [name, testCases] of this.eventCounts.entries()) {
      counts[name] = testCases.size
    }
    return counts
  }

  /**
   * Get target statistics.
   */
  getTargetStatistics(): Record<string, TargetStatistics> {
    const stats: Record<string, TargetStatistics> = {}
    for (const [label, tracker] of this.targetTrackers.entries()) {
      const distStats = tracker.getStatistics()
      stats[label] = {
        best: distStats.max,
        observations: distStats.count,
        mean: distStats.mean
      }
    }
    return stats
  }

  /**
   * Get all arbitrary statistics.
   * Returns empty object if no collectors exist (when detailed statistics disabled).
   */
  getArbitraryStatistics(): Record<string, ArbitraryStatistics> {
    const stats: Record<string, ArbitraryStatistics> = {}
    for (const [name, collector] of this.arbitraryCollectors.entries()) {
      stats[name] = collector.getStatistics()
    }
    return stats
  }

  /**
   * Reset the context.
   */
  reset(): void {
    this.arbitraryCollectors.clear()
    this.eventCounts.clear()
    this.targetTrackers.clear()
    this.currentTestCaseIndex = 0
  }

  private shouldLog(requiredVerbosity: Verbosity): boolean {
    const verbosity = this.options.verbosity ?? Verbosity.Normal
    return verbosity >= requiredVerbosity && verbosity !== Verbosity.Quiet
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level === 'debug' ? Verbosity.Debug : Verbosity.Normal)) return
    const entry: LogEntry = {level, message, ...(data !== undefined && {data})}
    if (this.options.logger !== undefined) {
      this.options.logger.log(entry)
    } else {
      // Fallback to console with minimal formatting
      const payload = data !== undefined ? JSON.stringify(data) : ''
      switch (level) {
        case 'warn':
          console.warn(message, payload)
          break
        case 'error':
          console.error(message, payload)
          break
        case 'debug':
          console.debug(`[DEBUG] ${message}`, payload)
          break
        default:
          console.log(message, payload)
      }
    }
  }
}

/**
 * Global context storage for fc.event() and fc.target() access.
 * Uses AsyncLocalStorage for context propagation in async environments.
 */
const statisticsContextStorage = new AsyncLocalStorage<StatisticsContext>()

/**
 * Get the current statistics context (for internal use).
 */
export function getCurrentStatisticsContext(): StatisticsContext | undefined {
  return statisticsContextStorage.getStore()
}

/**
 * Run a callback with a statistics context.
 */
export function runWithStatisticsContext<T>(
  context: StatisticsContext,
  callback: () => T
): T {
  return statisticsContextStorage.run(context, callback)
}
