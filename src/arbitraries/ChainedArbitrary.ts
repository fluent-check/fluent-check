import { FluentPick } from './types'
<<<<<<< HEAD
import { Arbitrary } from './internal'

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
=======
import { BaseArbitrary } from './internal'

export class ChainedArbitrary<A, B> extends BaseArbitrary<B> {
  constructor(public readonly baseArbitrary: BaseArbitrary<A>, public readonly f: (a: A) => BaseArbitrary<B>) {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
    super()
  }

  size() { return this.baseArbitrary.size() }
  pick() {
    const pick = this.baseArbitrary.pick()
    return (pick === undefined) ? undefined : this.f(pick.value).pick()
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }
}