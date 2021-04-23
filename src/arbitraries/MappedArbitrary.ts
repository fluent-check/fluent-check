import * as util from './util'
import {FluentPick, XOR} from './types'
import {Arbitrary} from './internal'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly shrinkHelper?: XOR<{inverseMap: (b: FluentPick<B>) => A[]},
    {canGenerate: (pick: FluentPick<B>) => boolean}>
  ) {
    super()
    this.canGenerate = this.shrinkHelper !== undefined && this.shrinkHelper.canGenerate !== undefined ?
      this.shrinkHelper.canGenerate : this.canGenerate
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = 'original' in p && p.original !== undefined ? p.original : p.value
    return {value: this.f(p.value), original}
  }

  pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick !== undefined ? this.mapFluentPick(pick) : undefined
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
    return this.baseArbitrary.shrink({value: initial.original, original: initial.original}).map(v => this.f(v))
  }

  canGenerate(pick: FluentPick<B>) {
    const inverseValues = this.shrinkHelper !== undefined && this.shrinkHelper.inverseMap !== undefined ?
      this.shrinkHelper.inverseMap(pick) : [pick.original]
    return inverseValues.some(value => this.baseArbitrary.canGenerate({value, original: pick.original}))
  }

  mutate(pick: FluentPick<B>, generator: () => number, maxNumMutations: number): FluentPick<B>[] {
    const inverseValue = this.shrinkHelper !== undefined && this.shrinkHelper.inverseMap !== undefined ?
      this.shrinkHelper.inverseMap(pick)[0] : pick.original

    const result: FluentPick<B>[] = []
    let numMutations = util.getRandomInt(1, maxNumMutations, generator)

    while (numMutations-- > 0) {
      result.push(this.mapFluentPick(this.baseArbitrary
        .mutate({value: inverseValue, original: pick.original}, generator, 1)[0]))
    }

    return result.reduce((acc, pick) => {
      if (this.canGenerate(pick) && acc.every(x => x.value !== pick.value)) acc.push(pick)
      return acc
    }, [] as FluentPick<B>[])
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      `Map Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
