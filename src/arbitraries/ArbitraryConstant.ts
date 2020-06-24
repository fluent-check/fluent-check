import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary } from './internal'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  size(): ArbitrarySize { return { type: 'exact', value: 1 } }
  pick(): FluentPick<A> { return { value: this.constant } }
  cornerCases() { return [ this.pick() ]}
}
