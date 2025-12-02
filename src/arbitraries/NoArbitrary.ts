import type {ExactSize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  override pick(): FluentPick<never> | undefined { return undefined }
  override size(): ExactSize { return exactSize(0) }
  override sampleWithBias(): FluentPick<never>[] { return [] }
  override sample(): FluentPick<never>[] { return [] }
  override map(_: (a: never) => any) { return NoArbitrary }
  override filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  override canGenerate(_: FluentPick<never>) { return false }
  override chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
  override toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}()
