import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary } from './internal'
import { IndexedPicker, Picker } from './Picker'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  picker(): Picker<never> {
    return new IndexedPicker(0, () => { throw new Error('impossible') })
  }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
  chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
}()
