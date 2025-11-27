import type {FluentPick} from './types.js'
import {Arbitrary} from './internal.js'

export abstract class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super()
  }

  override pick(generator: () => number) { return this.baseArbitrary.pick(generator) }
  override size() { return this.baseArbitrary.size() }
  override cornerCases() { return this.baseArbitrary.cornerCases() }

  override canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      'Wrapped Arbitrary:\n' + this.baseArbitrary.toString(depth + 1)
  }
}
