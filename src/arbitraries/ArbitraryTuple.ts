import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary, NoArbitrary } from './internal'
import * as fc from './index'

type Replace<T> = { [P in keyof T]: T[P] extends fc.Arbitrary<infer E> ? E : T[P] }

export class ArbitraryTuple<U extends Arbitrary<any>[]> extends Arbitrary<Replace<U>[]> {
  constructor(public readonly arbitraries: U) {
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
    const value: Replace<U>[] = []
    const original: any[] = []
    for (const a of this.arbitraries) {
      const pick = a.pick()
      if (pick === undefined) return undefined
      else {
        value.push(pick.value)
        original.push(pick.original)
      }
    }

    return { value, original }
  }

  cornerCases(): FluentPick<Replace<U>[]>[] {
    if (this.arbitraries.length === 0) return []
    let cases: FluentPick<Replace<U>[]>[] =
      this.arbitraries[0].cornerCases().map(c => ({ value: [c.value], original: [c.original] }))

    for (let i = 1; i < this.arbitraries.length; i++) {
      const nextCases: FluentPick<Replace<U>[]>[] = []
      cases.forEach(c => {
        this.arbitraries[i].cornerCases().forEach(cc => {
          const nc = JSON.parse(JSON.stringify(c))
          nc.value.push(cc.value)
          nc.original.push(cc.original)
          nextCases.push(nc)
        })
      })
      cases = nextCases
    }

    return cases
  }

  shrink(initial: FluentPick<any[]>): Arbitrary<any[]> {
    // TODO: Make this compatible with pick()
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
    if (pick.value.length !== this.arbitraries.length) return false

    for (let i = 0; i < pick.value.length; i++) {
      if (!this.arbitraries[i].canGenerate({ value: pick.value[i], original: pick.original[i] })) //?
        return false
    }

    return true
  }
}
