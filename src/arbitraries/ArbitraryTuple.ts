import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary, NoArbitrary } from './internal'
import * as fc from './index'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends fc.Arbitrary<infer E> ? E : T[P] }

export class ArbitraryTuple<U extends Arbitrary<any>[]> extends Arbitrary<UnwrapFluentPick<U>[]> {
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
    const value: UnwrapFluentPick<U>[] = []
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

  cornerCases() {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    return cornerCases.reduce((acc, cc) => acc.flatMap(a => cc.map(b => ({
      value: [...a.value, b.value],
      original: [...a.original, b.original]
    }))), [{ value: [], original: [] }])
  }

  shrink(initial) {
    const arbitraries = this.arbitraries.map((toShrink, i) => {
      return this.arbitraries.map(arbitrary => {
        return arbitrary === toShrink ? arbitrary.shrink({ value: initial.value[i], original: initial.original[i] }) : arbitrary
      })
    })

    return fc.union(...arbitraries.map(a => fc.tuple(...a)))
  }

  canGenerate(pick) {
    if (pick.value.length !== this.arbitraries.length) return false

    for (let i = 0; i < pick.value.length; i++) {
      if (!this.arbitraries[i].canGenerate({ value: pick.value[i], original: pick.original[i] })) //?
        return false
    }

    return true
  }
}
