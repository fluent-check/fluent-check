import { FluentPick } from './types'
import { BaseArbitrary } from './internal'

export class WrappedArbitrary<A> extends BaseArbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<BaseArbitrary<A>>) {
    super()
  }

  pick() { return this.baseArbitrary.pick() }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }
}