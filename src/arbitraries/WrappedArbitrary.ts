import { FluentPick } from './types'
<<<<<<< HEAD
import { Arbitrary } from './internal'

export class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
=======
import { BaseArbitrary } from './internal'

export class WrappedArbitrary<A> extends BaseArbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<BaseArbitrary<A>>) {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
    super()
  }

  pick() { return this.baseArbitrary.pick() }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }
}
