import { FluentPick } from './types'
<<<<<<< HEAD
import { Arbitrary, WrappedArbitrary } from './internal'

export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
=======
import { BaseArbitrary, WrappedArbitrary } from './internal'

export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<BaseArbitrary<A>>) {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
    super(baseArbitrary)
  }

  sample(sampleSize = 10): FluentPick<A>[] {
    // TODO: Here lies dragons! If you see start seeing things in double when
    // using this arbitrary, consider the culprit might lie in the way Map
    // deals with keys and equality
    const result = new Map<A, FluentPick<A>>()

    let bagSize = sampleSize
    while (result.size < bagSize) {
      const r = this.pick()
      if (!r) break
      if (!result.has(r.value)) result.set(r.value, r)
      bagSize = Math.min(sampleSize, this.size().value)
    }

    return Array.from(result.values())
  }

  shrink(initial: FluentPick<A>) {
    return this.baseArbitrary.shrink(initial).unique()
  }
}
