import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary } from './internal'
import { IndexedPicker, Picker } from './Picker'

export class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  size(): ArbitrarySize { return { type: 'exact', value: 1 } }
  picker(): Picker<A> { return new IndexedPicker<A>(1, () => ({ value: this.constant })) }
  cornerCases(): FluentPick<A>[] { return [{ value: this.constant }] }
}
