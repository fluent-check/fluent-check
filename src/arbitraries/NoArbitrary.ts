import {ExactSize, ExactSizeArbitrary, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

// Type assertion is safe: NoArbitrary.size() returns ExactSize at runtime
export const NoArbitrary = new class extends Arbitrary<never> {
  pick(): FluentPick<never> | undefined { return undefined }
  size(): ExactSize { return exactSize(0) }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
  chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
  toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}() as ExactSizeArbitrary<never>
