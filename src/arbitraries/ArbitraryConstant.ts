import type {ExactSize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  // Protected constructor enforces usage through static create() method
  protected constructor(public readonly constant: A) {
    super()
  }

  static create<A>(constant: A): ArbitraryConstant<A> {
    return new ArbitraryConstant(constant)
  }

  override size(): ExactSize { return exactSize(1) }
  override pick(): FluentPick<A> { return {value: this.constant, original: this.constant} }
  override cornerCases() { return [this.pick()] }
  override canGenerate(pick: FluentPick<A>) {
    return pick.value === this.constant
  }
  override toString(depth = 0): string { return ' '.repeat(depth * 2) + `Constant Arbitrary: ${this.constant}` }
}
