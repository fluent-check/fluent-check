import {FluentPick} from './types.js'
import {Arbitrary} from './internal.js'

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  override size() { return this.baseArbitrary.size() }

  override pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick === undefined ? undefined : this.f(pick.value).pick(generator)
  }

  override cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }

  override canGenerate<B>(_: FluentPick<B>): boolean {
    return true
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Chained Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
