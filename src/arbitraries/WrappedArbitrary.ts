import type {FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
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

  /** Delegates to base arbitrary's hash function */
  override hashCode(): HashFunction {
    return this.baseArbitrary.hashCode()
  }

  /** Delegates to base arbitrary's equals function */
  override equals(): EqualsFunction {
    return this.baseArbitrary.equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      'Wrapped Arbitrary:\n' + this.baseArbitrary.toString(depth + 1)
  }
}
