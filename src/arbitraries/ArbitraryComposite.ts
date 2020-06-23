import { NoArbitrary, Arbitrary } from './internal'
import { FluentPick } from './types'
import { mapArbitrarySize, NilArbitrarySize } from './util'
import * as fc from './index'
import { Picker } from './Picker'

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
    return new Picker(() => {
      const picked = Math.floor(Math.random() * this.arbitraries.length)
      return this.arbitraries[picked].picker().pick()
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
