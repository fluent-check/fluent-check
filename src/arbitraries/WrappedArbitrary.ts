import { FluentPick } from './types'
import { Arbitrary } from './internal'

export class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super()
  }

  picker() { return this.baseArbitrary.picker() }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }
}
