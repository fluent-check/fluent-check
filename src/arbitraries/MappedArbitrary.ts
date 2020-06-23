import { FluentPick } from './types'
import { Arbitrary } from './internal'
import { Picker } from './Picker'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => B) {
    super()
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = ('original' in p) ? p.original : p.value
    return ({ original, value: this.f(p.value) })
  }

  picker(): Picker<B> {
    return this.baseArbitrary.picker().map(v => this.mapFluentPick(v))
  }

  // TODO: This is not strictly true when the mapping function is not bijective. I suppose this is
  // a count-distinct problem, so we should probably either count the cardinality with a Set (for
  // small arbitraries), or use a cardinality estimator such as HyperLogLog for big ones. One
  // interesting information we could leverage here is that the new arbitrary size will never
  // be *above* the baseArbitrary.
  size() { return this.baseArbitrary.size() }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p))
  }

  shrink(initial: FluentPick<B>): Arbitrary<B> {
    return this.baseArbitrary.shrink({ original: initial.original, value: initial.original }).map(v => this.f(v))
  }

  canGenerate(pick: FluentPick<B>) {
    return this.baseArbitrary.canGenerate({ value: pick.original, original: pick.original }) /* && pick.value === this.f(pick.original) */
  }
}
