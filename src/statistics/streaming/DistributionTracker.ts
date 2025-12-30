import type {DistributionStatistics, HistogramBin} from '../types.js'
import {StreamingMeanVariance} from './StreamingMeanVariance.js'
import {StreamingMinMax} from './StreamingMinMax.js'
import {StreamingQuantiles, DEFAULT_QUANTILE_BUFFER_SIZE, DEFAULT_HISTOGRAM_SAMPLE_SIZE} from './StreamingQuantiles.js'

export const DEFAULT_HISTOGRAM_BINS = 10

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
      const bin = bins[idx]
      if (bin !== undefined) bin.count += 1
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
