import { FluentPick } from './types'
import { Arbitrary } from './internal'
import { Picker } from './Picker'

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  size() { return this.baseArbitrary.size() }
  picker(): Picker<B> {
    return new Picker(() => {
      const pick = this.baseArbitrary.picker().pick()
      return (pick === undefined) ? undefined : this.f(pick.value).picker().pick()
    })
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }
}
