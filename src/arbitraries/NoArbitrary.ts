import { ArbitrarySize, FluentPick, FluentSample } from './types'
import { Arbitrary } from './internal'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(): FluentSample<never> { return { items: [], confidence: 1.0 } }
  sample(): FluentSample<never> { return { items: [], confidence: 1.0 } }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
  chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
}()
