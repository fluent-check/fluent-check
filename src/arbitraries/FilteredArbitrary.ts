import {BetaDistribution} from '../statistics.js'
import type {EstimatedSize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {type Arbitrary, NoArbitrary, WrappedArbitrary} from './internal.js'
import {estimatedSize, lowerCredibleInterval, upperCredibleInterval} from './util.js'

export class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

  constructor(override readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
    super(baseArbitrary)
    this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
  }

  override size(): EstimatedSize {
    // TODO: Still not sure if we should use mode or mean for estimating the size (depends on which error we are trying
    // to minimize, L1 or L2)
    // Also, this assumes we estimate a continuous interval between 0 and 1;
    // We could try to change this to a beta-binomial distribution, which would provide us a discrete approach
    // for when we know the exact base population size.
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
      if (pick === undefined) break // TODO: update size estimation accordingly
      if (this.f(pick.value)) { this.sizeEstimation.alpha += 1; return pick }
      this.sizeEstimation.beta += 1
      // If we have a pretty good confidence that the size < 1, we stop trying
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1)

    return undefined
  }

  override cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  override shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    const shrunkBase = this.baseArbitrary.shrink(initialValue)

    // If the shrunk base arbitrary has corner cases and none of them satisfy
    // the predicate, treat it as empty instead of returning a filtered
    // arbitrary with non-zero size but no valid samples.
    const corners = shrunkBase.cornerCases()
    if (corners.length > 0 && !corners.some(c => this.f(c.value))) return NoArbitrary

    return shrunkBase.filter(v => this.f(v))
  }

  override canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) && this.f(pick.value)
  }

  /** Delegates to base arbitrary's hash function */
  override hashCode(): HashFunction {
    return this.baseArbitrary.hashCode()
  }

  /** Delegates to base arbitrary's equals function */
  override equals(): EqualsFunction {
    return this.baseArbitrary.equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Filtered Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
