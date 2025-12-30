/**
 * Default buffer sizes for quantile estimation and histogram sampling.
 */
export const DEFAULT_QUANTILE_BUFFER_SIZE = 100
export const DEFAULT_HISTOGRAM_SAMPLE_SIZE = 200

/**
 * Streaming quantile estimator using the P² algorithm for q1/median/q3 with
 * an initial exact phase. Maintains a bounded reservoir for histogram output.
 *
 * NOTE: This implementation uses non-null assertions for array access because:
 * 1. The P² algorithm uses fixed-size arrays of exactly 5 elements
 * 2. The arrays are initialized together when count === 5
 * 3. After initialization, all indices 0-4 are guaranteed to be valid
 * 4. TypeScript's type narrowing doesn't work well with dynamic numeric indexing
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

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
