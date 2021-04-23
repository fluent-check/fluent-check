import {Arbitrary} from './internal'
import {FluentPick} from './types'
import {mapArbitrarySize, NilArbitrarySize, getRandomInt} from './util'
import * as fc from './index'

export class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      mapArbitrarySize(e.size(), v => ({value: acc.value + v, type: acc.type, credibleInterval: acc.credibleInterval})),
    NilArbitrarySize
    )
  }

  pick(generator: () => number) {
    const weights = this.arbitraries.reduce(
      (acc, a) => { acc.push((acc[acc.length - 1] | 0) + a.size().value); return acc },
      new Array<number>()
    )
    const picked = Math.floor(generator() * weights[weights.length - 1])
    return this.arbitraries[weights.findIndex(s => s > picked)].pick(generator)
  }

  cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial)).map(a => a.shrink(initial))
    return fc.union(...arbitraries)
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }

  mutate(pick: FluentPick<A>, generator: () => number, maxNumMutations: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    const baseArbitrary = this.arbitraries.find(x => x.canGenerate(pick))

    if (baseArbitrary === undefined) return result

    const baseArbitrarySize = baseArbitrary.size()
    const numMutations = baseArbitrarySize.type === 'exact' ?
      Math.min(baseArbitrarySize.value - 1, getRandomInt(1, maxNumMutations, generator)) :
      getRandomInt(1, maxNumMutations, generator)

    while (result.length < numMutations) {
      const mutatedPick = baseArbitrary.mutate(pick, generator, 1)[0]
      if (baseArbitrary.canGenerate(mutatedPick) && result.every(x => x.value !== mutatedPick.value))
        result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
