import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary } from './internal'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
}()
