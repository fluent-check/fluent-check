import type {ExactSize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

// NoArbitrary uses `any` as its type parameter to allow it to be used
// as a return type for any Arbitrary<T> without type variance issues
class NoArbitraryClass extends Arbitrary<any> {
  override pick(): FluentPick<any> | undefined { return undefined }
  override size(): ExactSize { return exactSize(0) }
  override sampleWithBias(): FluentPick<any>[] { return [] }
  override sample(): FluentPick<any>[] { return [] }
  override map(_: (a: any) => any) { return NoArbitrary }
  override filter(_: (a: any) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  override canGenerate(_: FluentPick<any>) { return false }
  override chain<B>(_: (a: any) => Arbitrary<B>) { return NoArbitrary as Arbitrary<B> }
  override hashCode(): HashFunction<any> { return () => 0 }
  override equals(): EqualsFunction<any> { return () => true }
  override toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}

// Use `any` instead of `never` to avoid type variance issues with hashCode/equals
// The class is still safe because it never produces any values
export const NoArbitrary: Arbitrary<any> = new NoArbitraryClass()
