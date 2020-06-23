import { FluentPick } from './types'
import { BaseArbitrary } from './internal'

export class ChainedArbitrary<A, B> extends BaseArbitrary<B> {
  constructor(public readonly baseArbitrary: BaseArbitrary<A>, public readonly f: (a: A) => BaseArbitrary<B>) {
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