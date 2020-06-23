import { FluentPick } from './types'
import { Arbitrary, WrappedArbitrary } from './internal'
import { Picker } from './Picker'

export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super(baseArbitrary)
  }

  picker(): Picker<A> {
    return this.baseArbitrary.picker()
  }

  sample(sampleSize = 10): FluentPick<A>[] {
    // TODO: Here lies dragons! If you see start seeing things in double when
    // using this arbitrary, consider the culprit might lie in the way Map
    // deals with keys and equality
    const result = new Map<A, FluentPick<A>>()
    const picker = this.baseArbitrary.picker()

    let bagSize = sampleSize
    while (result.size < bagSize) {
      const r = picker.pick()
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
