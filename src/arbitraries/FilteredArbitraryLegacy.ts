import {BetaDistribution} from '../statistics.js'
import type {EstimatedSize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {type Arbitrary, NoArbitrary, WrappedArbitrary} from './internal.js'
import {estimatedSize, lowerCredibleInterval, upperCredibleInterval} from './util.js'

/**
 * Legacy implementation of FilteredArbitrary.
 * preserved for research/comparative purposes.
 *
 * Flaws:
 * - "Cold Start" bias: Uses optimistic Beta(2,1) prior.
 * - No warm-up sampling: Returns potentially inaccurate size() before sampling.
 */
export class FilteredArbitraryLegacy<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

  constructor(override readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
    super(baseArbitrary)
    this.sizeEstimation = new BetaDistribution(2, 1) // Optimistic prior
  }

  override size(): EstimatedSize {
    const baseSize = this.baseArbitrary.size()
    const v = baseSize.value
    return estimatedSize(
      Math.round(v * this.sizeEstimation.mode()),
      [
        v * this.sizeEstimation.inv(lowerCredibleInterval),
        v * this.sizeEstimation.inv(upperCredibleInterval)
      ]
    )
  }

  override pick(generator: () => number): FluentPick<A> | undefined {
    do {
      const pick = this.baseArbitrary.pick(generator)
      if (pick === undefined) break
      if (this.f(pick.value)) { this.sizeEstimation.alpha += 1; return pick }
      this.sizeEstimation.beta += 1
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1)

    return undefined
  }

  override cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  override shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    const shrunkBase = this.baseArbitrary.shrink(initialValue)
    const corners = shrunkBase.cornerCases()
    if (corners.length > 0 && !corners.some(c => this.f(c.value))) return NoArbitrary
    return shrunkBase.filter(v => this.f(v))
  }

  override canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) && this.f(pick.value)
  }

  override hashCode(): HashFunction {
    return this.baseArbitrary.hashCode()
  }

  override equals(): EqualsFunction {
    return this.baseArbitrary.equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Filtered Arbitrary Legacy: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
