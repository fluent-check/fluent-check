import {Arbitrary} from './internal.js'
import {FluentPick} from './types.js'
import {mapArbitrarySize, NilArbitrarySize} from './util.js'
import * as fc from './index.js'

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

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
