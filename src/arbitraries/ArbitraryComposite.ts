import { NoArbitrary, Arbitrary } from './internal'
import { FluentPick } from './types'
import { mapArbitrarySize, NilArbitrarySize } from './util'
import * as fc from './index'
import { IndexedPicker, Picker } from './Picker'

export class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      mapArbitrarySize(e.size(), v => ({ value: acc.value + v, type: acc.type })),
    NilArbitrarySize)
  }

  picker(): Picker<A> {
    // TODO: use weighted sampling in IndexedPicker
    return new IndexedPicker(this.size().value, idx => {
      let arbIndex = 0
      while (idx >= this.arbitraries[arbIndex].size().value) {
        idx -= this.arbitraries[arbIndex].size().value
        arbIndex++
      }
      const arb = this.arbitraries[arbIndex].picker()
      return arb instanceof IndexedPicker ? arb.pickWithIndex(idx) : arb.pick()!
    })
  }

  cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial)).map(a => a.shrink(initial)).filter(a => a !== NoArbitrary)
    if (arbitraries.length === 0) return NoArbitrary
    return fc.union(...arbitraries)
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }
}
