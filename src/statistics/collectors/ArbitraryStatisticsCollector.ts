import type {ArbitraryStatistics, LengthStatistics} from '../types.js'
import {DistributionTracker} from '../streaming/DistributionTracker.js'
import {stringify} from '../../arbitraries/util.js'

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
