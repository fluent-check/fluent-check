import { BetaDistribution } from '../statistics'
import { FluentPick } from './types'
<<<<<<< HEAD
import { Arbitrary, NoArbitrary, WrappedArbitrary } from './internal'
=======
import { BaseArbitrary, NoArbitrary, WrappedArbitrary } from './internal'
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
import { lowerCredibleInterval, upperCredibleInterval } from './util'

export class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

<<<<<<< HEAD
  constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
=======
  constructor(readonly baseArbitrary: BaseArbitrary<A>, public readonly f: (a: A) => boolean) {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
    super(baseArbitrary)
    this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
  }

  size() {
    // TODO: Still not sure if we should use mode or mean for estimating the size (depends on which error we are trying to minimize, L1 or L2)
    // Also, this assumes we estimate a continuous interval between 0 and 1;
    // We could try to change this to a beta-binomial distribution, which would provide us a discrete approach
    // for when we know the exact base population size.
    return this.baseArbitrary.mapArbitrarySize(v =>
      ({ type: 'estimated',
        value: Math.round(v * this.sizeEstimation.mode()),
        credibleInterval: [v * this.sizeEstimation.inv(lowerCredibleInterval), v * this.sizeEstimation.inv(upperCredibleInterval)] }))
  }

  pick(): FluentPick<A> | undefined {
    do {
      const pick = this.baseArbitrary.pick()
      if (!pick) break // TODO: update size estimation accordingly
      if (this.f(pick.value)) { this.sizeEstimation.alpha += 1; return pick }
      this.sizeEstimation.beta += 1
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1) // If we have a pretty good confidence that the size < 1, we stop trying

    return undefined
  }

  cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    return this.baseArbitrary.shrink(initialValue).filter(v => this.f(v))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) /* && this.f(pick.value) */
  }
}