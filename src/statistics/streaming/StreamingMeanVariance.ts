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
