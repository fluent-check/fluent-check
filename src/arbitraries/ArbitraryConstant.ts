import {ArbitrarySize, FluentPick} from './types'
import {Arbitrary} from './internal'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  size(): ArbitrarySize { return {type: 'exact', value: 1, credibleInterval: [1, 1]} }
  pick(): FluentPick<A> { return {value: this.constant, original: this.constant} }
  cornerCases() { return [this.pick()] }
  canGenerate(pick: FluentPick<A>) { return pick.value === this.constant }
  mutate(_: FluentPick<A>, __: () => number, ___: number): FluentPick<A>[] { return [this.pick()] }
  toString(depth = 0): string { return ' '.repeat(depth * 2) + `Constant Arbitrary: ${this.constant}` }
}
