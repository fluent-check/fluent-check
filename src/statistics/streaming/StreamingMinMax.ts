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
