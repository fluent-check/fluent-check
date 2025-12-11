import jstat from 'jstat'
import {AsyncLocalStorage} from 'node:async_hooks'

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
  /** Array length statistics for array arbitraries (optional) */
  arrayLengths?: LengthStatistics
  /** String length statistics for string arbitraries (optional) */
  stringLengths?: LengthStatistics
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
 * Length statistics for arrays or strings.
 */
export interface LengthStatistics {
  /** Minimum length generated */
  min: number
  /** Maximum length generated */
  max: number
  /** Mean length */
  mean: number
  /** Estimated median length */
  median: number
  /** Number of observations */
  count: number
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
 * Default buffer size for streaming quantile estimation.
 * For samples <= this size, exact quantiles are computed.
 * For larger samples, approximate quantiles using a fixed-size buffer.
 */
export const DEFAULT_QUANTILE_BUFFER_SIZE = 100

/**
 * Streaming quantile estimator using a simplified approach.
 *
 * For small samples (n <= DEFAULT_QUANTILE_BUFFER_SIZE), stores all values and computes exact quantiles.
 * For large samples, uses a fixed-size buffer with approximate quantiles via random replacement.
 *
 * Limitations:
 * - The random replacement strategy for large samples provides approximate quantiles
 *   but may not be as accurate as more sophisticated algorithms (e.g., P² algorithm).
 * - For production use with very large samples, consider implementing a more advanced
 *   streaming quantile algorithm if higher accuracy is required.
 *
 * The current implementation prioritizes simplicity and O(k) memory usage over
 * optimal accuracy for large samples.
 */
export class StreamingQuantiles {
  private readonly values: number[] = []
  private readonly maxBufferSize: number
  private sorted = false

  constructor(maxBufferSize = DEFAULT_QUANTILE_BUFFER_SIZE) {
    this.maxBufferSize = maxBufferSize
  }

  /**
   * Add a value to the stream.
   */
  add(value: number): void {
    if (this.values.length < this.maxBufferSize) {
      this.values.push(value)
      this.sorted = false
    } else {
      // For large samples, use reservoir sampling or approximate quantiles
      // For now, we'll use a simple approach: replace a random element
      const index = Math.floor(Math.random() * this.maxBufferSize)
      this.values[index] = value
      this.sorted = false
    }
  }

  /**
   * Get a quantile estimate (0.0 to 1.0).
   */
  getQuantile(p: number): number {
    if (p < 0 || p > 1) {
      throw new Error(`Quantile must be between 0 and 1, got ${p}`)
    }
    if (this.values.length === 0) {
      return NaN
    }
    if (!this.sorted) {
      this.values.sort((a, b) => a - b)
      this.sorted = true
    }
    if (this.values.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.values[0]!
    }
    const index = p * (this.values.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    if (lower === upper) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.values[lower]!
    }
    const weight = index - lower
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.values[lower]! * (1 - weight) + this.values[upper]! * weight
  }

  /**
   * Get the median (50th percentile).
   */
  getMedian(): number {
    return this.getQuantile(0.5)
  }

  /**
   * Get the first quartile (25th percentile).
   */
  getQ1(): number {
    return this.getQuantile(0.25)
  }

  /**
   * Get the third quartile (75th percentile).
   */
  getQ3(): number {
    return this.getQuantile(0.75)
  }

  /**
   * Get the number of values added.
   */
  getCount(): number {
    return this.values.length
  }

  /**
   * Reset the estimator.
   */
  reset(): void {
    this.values.length = 0
    this.sorted = false
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

  constructor(maxQuantileBufferSize = DEFAULT_QUANTILE_BUFFER_SIZE) {
    this.meanVariance = new StreamingMeanVariance()
    this.minMax = new StreamingMinMax()
    this.quantiles = new StreamingQuantiles(maxQuantileBufferSize)
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
 * Collector for per-arbitrary statistics.
 */
export class ArbitraryStatisticsCollector {
  /**
   * Number of samples generated for this arbitrary.
   * Note: This counts all generated samples during traversal, including those
   * that may be filtered by preconditions. This may be higher than the number
   * of test cases that actually executed (testsRun) when preconditions filter samples.
   */
  private samplesGenerated = 0
  private readonly uniqueValues = new Set<string>()
  private readonly cornerCasesTested: unknown[] = []
  private cornerCasesTotal = 0
  private distributionTracker?: DistributionTracker
  private arrayLengthTracker?: DistributionTracker
  private stringLengthTracker?: DistributionTracker
  private isNumeric = false

  /**
   * Record that a sample was generated.
   * This is called during traversal for each sample, regardless of whether
   * the test case passes, fails, or is filtered by preconditions.
   */
  recordSample(value: unknown, arbitrary: {cornerCases(): unknown[]}): void {
    this.samplesGenerated++

    // Track uniqueness using JSON stringification (simple approach)
    // For better performance with large objects, could use hashCode/equals if available
    const valueKey = JSON.stringify(value)
    this.uniqueValues.add(valueKey)

    // Check if this is a corner case
    const cornerCases = arbitrary.cornerCases()
    this.cornerCasesTotal = cornerCases.length
    for (const cornerCase of cornerCases) {
      if (JSON.stringify(cornerCase) === valueKey) {
        this.cornerCasesTested.push(value)
        break
      }
    }
  }

  /**
   * Record a numeric value for distribution tracking.
   */
  recordNumericValue(value: number): void {
    if (!this.isNumeric) {
      this.isNumeric = true
      this.distributionTracker = new DistributionTracker()
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.distributionTracker!.add(value)
  }

  /**
   * Record an array length value for tracking.
   */
  recordArrayLength(length: number): void {
    if (this.arrayLengthTracker === undefined) {
      this.arrayLengthTracker = new DistributionTracker()
    }
    this.arrayLengthTracker.add(length)
  }

  /**
   * Record a string length value for tracking.
   */
  recordStringLength(length: number): void {
    if (this.stringLengthTracker === undefined) {
      this.stringLengthTracker = new DistributionTracker()
    }
    this.stringLengthTracker.add(length)
  }

  /**
   * Get the collected statistics.
   */
  getStatistics(): ArbitraryStatistics {
    const stats: ArbitraryStatistics = {
      samplesGenerated: this.samplesGenerated,
      uniqueValues: this.uniqueValues.size,
      cornerCases: {
        tested: this.cornerCasesTested,
        total: this.cornerCasesTotal
      }
    }

    if (this.distributionTracker !== undefined && this.samplesGenerated > 0) {
      try {
        stats.distribution = this.distributionTracker.getStatistics()
      } catch (e) {
        // If no values were added, distribution remains undefined
        // This can happen if recordNumericValue was never called despite samples being generated
        if (e instanceof Error && !e.message.includes('no values added')) {
          // Unexpected error - log for debugging (in production, this would use a logger)
          console.warn(`Unexpected error getting distribution statistics: ${e.message}`)
        }
      }
    }

    if (this.arrayLengthTracker !== undefined && this.samplesGenerated > 0) {
      try {
        const lengthStats = this.arrayLengthTracker.getStatistics()
        stats.arrayLengths = {
          min: lengthStats.min,
          max: lengthStats.max,
          mean: lengthStats.mean,
          median: lengthStats.median,
          count: lengthStats.count
        }
      } catch (e) {
        // If no values were added, array length stats remain undefined
        if (e instanceof Error && !e.message.includes('no values added')) {
          console.warn(`Unexpected error getting array length statistics: ${e.message}`)
        }
      }
    }

    if (this.stringLengthTracker !== undefined && this.samplesGenerated > 0) {
      try {
        const lengthStats = this.stringLengthTracker.getStatistics()
        stats.stringLengths = {
          min: lengthStats.min,
          max: lengthStats.max,
          mean: lengthStats.mean,
          median: lengthStats.median,
          count: lengthStats.count
        }
      } catch (e) {
        // If no values were added, string length stats remain undefined
        if (e instanceof Error && !e.message.includes('no values added')) {
          console.warn(`Unexpected error getting string length statistics: ${e.message}`)
        }
      }
    }

    return stats
  }

  /**
   * Reset the collector.
   */
  reset(): void {
    this.samplesGenerated = 0
    this.uniqueValues.clear()
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
  recordEvent(name: string, testCaseIndex: number): void {
    let testCases = this.eventCounts.get(name)
    if (testCases === undefined) {
      testCases = new Set<number>()
      this.eventCounts.set(name, testCases)
    }
    testCases.add(testCaseIndex)
  }

  /**
   * Record a target observation.
   */
  recordTarget(label: string, observation: number): void {
    if (!Number.isFinite(observation)) {
      // Invalid observation - would log warning in actual implementation
      return
    }
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
