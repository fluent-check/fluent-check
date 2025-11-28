import type {FluentPick, XOR} from './types.js'
import {Arbitrary} from './internal.js'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>
  ) {
    super()
    this.canGenerate = this.shrinkHelper !== undefined && this.shrinkHelper.canGenerate !== undefined ?
      this.shrinkHelper.canGenerate : this.canGenerate
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = 'original' in p && p.original !== undefined ? p.original : p.value
    return {value: this.f(p.value), original}
  }

  override pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick !== undefined ? this.mapFluentPick(pick) : undefined
  }

  // TODO: This is not strictly true when the mapping function is not bijective. I suppose this is
  // a count-distinct problem, so we should probably either count the cardinality with a Set (for
  // small arbitraries), or use a cardinality estimator such as HyperLogLog for big ones. One
  // interesting information we could leverage here is that the new arbitrary size will never
  // be *above* the baseArbitrary.
  override size() { return this.baseArbitrary.size() }

  override cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p))
  }

  override shrink(initial: FluentPick<B>): Arbitrary<B> {
    return this.baseArbitrary.shrink({value: initial.original, original: initial.original}).map(v => this.f(v))
  }

  override canGenerate(pick: FluentPick<B>) {
    const inverseValues = this.shrinkHelper !== undefined && this.shrinkHelper.inverseMap !== undefined ?
      this.shrinkHelper.inverseMap(pick.value) : [pick.original]
    return inverseValues.some(value => this.baseArbitrary.canGenerate({value, original: pick.original}))
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      `Map Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
