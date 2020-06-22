import { BaseArbitrary, NoArbitrary } from './internal'
import { FluentPick } from './types'
import { NilArbitrarySize } from './util'

export class ArbitraryComposite<A> extends BaseArbitrary<A> {
  constructor(public arbitraries: BaseArbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      e.mapArbitrarySize(v => ({ value: acc.value + v, type: acc.type })),
    NilArbitrarySize)
  }

  pick() {
    const picked = Math.floor(Math.random() * this.arbitraries.length)
    return this.arbitraries[picked].pick()
  }

  cornerCases(): FluentPick<A>[] {
    const cornerCases: FluentPick<A>[] = []
    for (const a of this.arbitraries)
      cornerCases.push(...a.cornerCases())

    return cornerCases
  }

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial))

    if (arbitraries.length === 0) return NoArbitrary

    return new ArbitraryComposite(arbitraries.map(a => a.shrink(initial)))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }
}
