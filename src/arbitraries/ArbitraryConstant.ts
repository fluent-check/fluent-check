import {ExactSize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  size(): ExactSize { return exactSize(1) }
  pick(): FluentPick<A> { return {value: this.constant, original: this.constant} }
  cornerCases() { return [this.pick()] }
  canGenerate(pick: FluentPick<A>) {
    return pick.value === this.constant
  }
  toString(depth = 0): string { return ' '.repeat(depth * 2) + `Constant Arbitrary: ${this.constant}` }
}
