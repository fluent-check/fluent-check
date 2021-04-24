import * as util from './util'
import {FluentPick} from './types'
import {Arbitrary} from './internal'

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  size() { return this.baseArbitrary.size() }

  pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick === undefined ? undefined : this.f(pick.value).pick(generator)
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }

  canGenerate<B>(_: FluentPick<B>): boolean {
    return true
  }

  mutate(_: FluentPick<B>, generator: () => number, maxNumMutations: number): FluentPick<B>[] {
    const result: FluentPick<B>[] = []

    const arbitrarySize = this.size()
    const numMutations = arbitrarySize.type === 'exact' ?
      Math.min(arbitrarySize.value - 1, util.getRandomInt(1, maxNumMutations, generator)) :
      util.getRandomInt(1, maxNumMutations, generator)

    while (result.length < numMutations) {
      const mutatedPick = this.pick(generator)
      if (mutatedPick !== undefined && result.every(x => x.value !== mutatedPick.value)) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Chained Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
