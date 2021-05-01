import * as util from './util'
import {Arbitrary} from './internal'
import {FluentPick, XOR} from './types'
import {StrategyExtractedConstants} from '../strategies/FluentStrategyTypes'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly helper?: XOR<{inverseMap: (b: FluentPick<B>) => A[]},{
      canGenerate: (pick: FluentPick<B>) => boolean,
      mutate?: (pick: FluentPick<B>, generator: () => number, maxNumMutations: number) => FluentPick<B>[]
    }>
  ) {
    super()

    if (this.helper !== undefined && this.helper.canGenerate !== undefined) this.canGenerate = this.helper.canGenerate
    if (this.helper !== undefined && this.helper.mutate !== undefined) this.mutate = this.helper.mutate
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
    const inverseValues = this.helper !== undefined && this.helper.inverseMap !== undefined ?
      this.helper.inverseMap(pick) : [pick.original]
    return inverseValues.some(value => this.baseArbitrary.canGenerate({value, original: pick.original}))
  }

  mutate(pick: FluentPick<B>, generator: () => number, maxNumMutations: number): FluentPick<B>[] {
    const inverseValue = this.helper !== undefined && this.helper.inverseMap !== undefined ?
      this.helper.inverseMap(pick)[0] : pick.original

    const result: FluentPick<B>[] = []
    const numMutations = util.computeNumMutations(this.size(), generator, maxNumMutations)

    while (result.length < numMutations) {
      const newPick = this.baseArbitrary.mutate({value: inverseValue, original: pick.original}, generator, 1)[0]
      if (newPick === undefined) return result
      const mutatedPick = this.mapFluentPick(newPick)
      if (this.canGenerate(mutatedPick)
      && JSON.stringify(pick.value) !== JSON.stringify(mutatedPick.value)
      && result.every(x => JSON.stringify(x.value) !== JSON.stringify(mutatedPick.value))) result.push(mutatedPick)
    }

    return result
  }

  extractedConstants(constants: StrategyExtractedConstants): FluentPick<B>[] {
    const extractedConstants: FluentPick<B>[] = []

    if (util.isString(this.toString().split('\n')[0]))
      constants['string'].forEach(elem => extractedConstants.push({
        value: elem, original: Array.from(elem as string).map(x => x.charCodeAt(0))
      }))
    else extractedConstants.push(... this.baseArbitrary.extractedConstants(constants).map(p => this.mapFluentPick(p)))

    return extractedConstants.filter(x => this.canGenerate(x))
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      `Map Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
