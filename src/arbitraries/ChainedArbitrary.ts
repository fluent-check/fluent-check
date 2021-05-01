import * as util from './util'
import {FluentPick} from './types'
import {Arbitrary} from './internal'
import {StrategyExtractedConstants} from '../strategies/FluentStrategyTypes'

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

  extractedConstants(constants: StrategyExtractedConstants): FluentPick<B>[] {
    return this.baseArbitrary.extractedConstants(constants).flatMap(p => this.f(p.value).extractedConstants(constants))
  }

  canGenerate<B>(_: FluentPick<B>): boolean {
    return true
  }

  mutate(pick: FluentPick<B>, generator: () => number, maxNumMutations: number): FluentPick<B>[] {
    const result: FluentPick<B>[] = []
    const numMutations = util.computeNumMutations(this.size(), generator, maxNumMutations)

    while (result.length < numMutations) {
      const mutatedPick = this.pick(generator)
      if (mutatedPick !== undefined
        && JSON.stringify(pick.value) !== JSON.stringify(mutatedPick.value)
        && result.every(x => JSON.stringify(x.value) !== JSON.stringify(mutatedPick.value))) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Chained Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
