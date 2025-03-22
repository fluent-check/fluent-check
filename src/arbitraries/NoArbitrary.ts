import {ArbitrarySize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  pick(): FluentPick<never> | undefined { return undefined }
  size(): ArbitrarySize { return {value: 0, type: 'exact', credibleInterval: [0, 0]} }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
  chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
  toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}()
