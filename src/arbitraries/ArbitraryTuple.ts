import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary, NoArbitrary } from './internal'
import * as fc from './index'

export class ArbitraryTuple extends Arbitrary<any[]> {
  constructor(public readonly arbitraries : Arbitrary<any>[]) {
    super()
  }

  size(): ArbitrarySize {
    let value = 1
    let type: 'exact' | 'estimated' = 'exact'

    for (const a of this.arbitraries) {
      const size = a.size()
      type = (size.type === 'exact') ? type : 'estimated'
      value *= a.size().value
    }

    return { value, type }
  }

  pick() {
    const value : any[] = []

    for (const a of this.arbitraries)
      value.push(a.pick())

    return { value }
  }

  cornerCases() {
    // TODO
    return []
  }

  shrink(initial: FluentPick<any[]>): Arbitrary<any[]> {
    const arbitraries : Arbitrary<any>[] = []

    for (let i = 0; i < this.arbitraries.length; i++) {
      initial.value[i].original ?
        arbitraries.push(this.arbitraries[i].shrink({ value : initial.value[i].value, original: initial.value[i].original })) :
        arbitraries.push(this.arbitraries[i].shrink({ value : initial.value[i].value }))
    }

    if (arbitraries.some(a => a === NoArbitrary))
      return NoArbitrary

    return fc.tuple(...arbitraries)
  }

  canGenerate(pick: FluentPick<any[]>) {
    //TODO
    return true
  }
}
