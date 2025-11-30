import type {ExactSize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  override size(): ExactSize { return exactSize(1) }
  override pick(): FluentPick<A> { return {value: this.constant, original: this.constant} }
  override cornerCases() { return [this.pick()] }
  override canGenerate(pick: FluentPick<A>) {
    return pick.value === this.constant
  }

  /** Constant hash - always returns the same value since there's only one possible value */
  override hashCode(): HashFunction {
    return (): number => 0
  }

  /** Constant equality - uses reference equality */
  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => a === b
  }

  override toString(depth = 0): string { return ' '.repeat(depth * 2) + `Constant Arbitrary: ${this.constant}` }
}
