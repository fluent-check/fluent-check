import type {EstimatedSizeArbitrary, ExactSize, ExactSizeArbitrary, FluentPick, XOR} from './types.js'
import {Arbitrary, FilteredArbitrary, MappedArbitrary} from './internal.js'
import {exactSize} from './util.js'

export class ArbitraryConstant<A> extends Arbitrary<A> implements ExactSizeArbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  override size(): ExactSize { return exactSize(1) }

  // When shrinkHelper is provided, use MappedArbitrary to honor custom canGenerate/inverseMap.
  // Otherwise, return a simple ArbitraryConstant for efficiency.
  override map<B>(
    f: (a: A) => B,
    shrinkHelper?: XOR<{inverseMap: (b: NoInfer<B>) => A[]}, {canGenerate: (pick: FluentPick<NoInfer<B>>) => boolean}>
  ): ExactSizeArbitrary<B> {
    if (shrinkHelper !== undefined) {
      return new MappedArbitrary(this, f, shrinkHelper) as ExactSizeArbitrary<B>
    }
    return new ArbitraryConstant(f(this.constant))
  }

  // Filtering a constant returns a FilteredArbitrary (EstimatedSizeArbitrary)
  override filter(f: (a: A) => boolean): EstimatedSizeArbitrary<A> {
    return new FilteredArbitrary(this, f) as EstimatedSizeArbitrary<A>
  }

  override suchThat(f: (a: A) => boolean): EstimatedSizeArbitrary<A> {
    return this.filter(f)
  }

  override pick(): FluentPick<A> { return {value: this.constant, original: this.constant} }
  override cornerCases() { return [this.pick()] }
  override canGenerate(pick: FluentPick<A>) {
    return pick.value === this.constant
  }
  override toString(depth = 0): string { return ' '.repeat(depth * 2) + `Constant Arbitrary: ${this.constant}` }
}
