import type {ArbitrarySize, FluentPick} from './types.js'
import {Arbitrary} from './internal.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'

type UnwrapArbitrary<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : never }

export class ArbitraryTuple<U extends Arbitrary<any>[], A = UnwrapArbitrary<U>> extends Arbitrary<A> {
  constructor(public readonly arbitraries: U) {
    super()
  }

  override size(): ArbitrarySize {
    let value = 1
    let isEstimated = false

    for (const a of this.arbitraries) {
      const size = a.size()
      if (size.type === 'estimated') isEstimated = true
      value *= size.value
    }

    // todo: fix credible interval for estimated sizes
    return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
  }

  override pick(generator: () => number): FluentPick<A> | undefined {
    const value: any = []
    const original: any[] = []

    for (const a of this.arbitraries) {
      const pick = a.pick(generator)
      if (pick === undefined) return undefined
      else {
        value.push(pick.value)
        original.push(pick.original)
      }
    }

    return {value, original}
  }

  override cornerCases(): FluentPick<A>[] {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    return cornerCases.reduce((acc, cc) => acc.flatMap(a => cc.map(b => ({
      value: [...a.value, b.value],
      original: [...a.original, b.original]
    }))), [{value: [], original: []}])
  }

  override shrink(initial: FluentPick<A>): Arbitrary<A> {
    const value = initial.value as unknown[]
    const original = initial.original as unknown[]
    return fc.union(...this.arbitraries.map((_, selected) =>
      fc.tuple(...this.arbitraries.map((arbitrary, i) =>
        selected === i ?
          arbitrary.shrink({value: value[i], original: original[i]}) :
          fc.constant(value[i])
      )))) as Arbitrary<A>
  }

  override canGenerate(pick: FluentPick<A>): boolean {
    const value = pick.value as unknown[]
    const original = pick.original as unknown[]
    for (const i in value) {
      const index = Number(i)
      const arbitrary = this.arbitraries[index]
      const val = value[index]
      if (arbitrary === undefined || val === undefined) {
        return false
      }
      const orig = original[index]
      if (!arbitrary.canGenerate({value: val, original: orig}))
        return false
    }

    return true
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
