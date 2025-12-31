import type {ExactSize, FluentPick, ExactSizeArbitrary} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {exactSize} from './util.js'

// NoArbitrary uses `any` as its type parameter internally to avoid type variance
// issues with hashCode/equals, but is typed as ExactSizeArbitrary<never> at export.
// Due to covariance on `never`, ExactSizeArbitrary<never> is assignable to
// ExactSizeArbitrary<T> for any T, allowing it to be used as a return type
// for any factory function that returns ExactSizeArbitrary<T>.
//
// IMPORTANT: filter() and suchThat() are NOT overridden here. They inherit from
// Arbitrary, which returns FilteredArbitrary. This ensures type soundness:
// the ExactSizeArbitrary interface declares filter() returns EstimatedSizeArbitrary,
// and FilteredArbitrary correctly has size(): EstimatedSize.
class NoArbitraryClass extends Arbitrary<any> {
  override pick(): FluentPick<any> | undefined { return undefined }
  override size(): ExactSize { return exactSize(0) }
  override sampleWithBias(): FluentPick<any>[] { return [] }
  override sample(): FluentPick<any>[] { return [] }
  override map(_: (a: any) => any) { return NoArbitrary }
  // filter() inherited from Arbitrary - returns FilteredArbitrary (EstimatedSizeArbitrary)
  // suchThat() inherited from Arbitrary - calls filter()
  unique() { return NoArbitrary }
  override canGenerate(_: FluentPick<any>) { return false }
  override chain<B>(_: (a: any) => Arbitrary<B>) { return NoArbitrary as Arbitrary<B> }
  override hashCode(): HashFunction<any> { return () => 0 }
  override equals(): EqualsFunction<any> { return (_a: unknown, _b: unknown): boolean => true }
  override toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}

// Export as ExactSizeArbitrary<never> to provide precise type information.
// Since the size is exactly 0 (not an estimate), this is semantically correct.
// The internal implementation uses `any` to avoid type variance issues, but
// the external type is `never` which is more accurate.
export const NoArbitrary: ExactSizeArbitrary<never> = new NoArbitraryClass() as any as ExactSizeArbitrary<never>
