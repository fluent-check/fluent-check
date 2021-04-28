import {ArbitrarySize, FluentPick} from './types'
import {Arbitrary} from './internal'
import * as fc from './index'

type UnwrapArbitrary<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : never }

export class ArbitraryTuple<U extends Arbitrary<any>[], A = UnwrapArbitrary<U>> extends Arbitrary<A> {
  constructor(public readonly arbitraries: U) {
    super()
  }

  size(): ArbitrarySize {
    let value = 1
    let type: 'exact' | 'estimated' = 'exact'

    for (const a of this.arbitraries) {
      const size = a.size()
      type = size.type === 'exact' ? type : 'estimated'
      value *= a.size().value
    }

    // todo: fix credible interval
    return {value, type, credibleInterval: [value, value]}
  }

  pick(generator: () => number, precision?: number): FluentPick<A> | undefined {
    const value: any = []
    const original: any[] = []

    let index = 0
    const prev: Arbitrary<any>[] = []
    for (const a of this.arbitraries) {
      const pick = a.pick(generator, precision)
      if (pick === undefined) return undefined
      else {
        value.push(pick.value)
        original.push(pick.original)

        let pickIdx = pick.index ?? 0
        prev.forEach(p => {
          pickIdx *= p.size().credibleInterval[1]
        })
        index += pickIdx
        prev.push(a)
      }
    }

    return {value, original, index}
  }

  cornerCases(): FluentPick<A>[] {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    const sizes: number[] = []
    for(const arb of this.arbitraries)
      sizes.push(arb.size().credibleInterval[1])
    const getPrevSizes = (index: number) => {
      let size = 1
      for (let i = 0; i < index; i++)
        size *= sizes[i]
      return size
    }

    return cornerCases.reduce((acc, cc, idx) => acc.flatMap(a => cc.map(b => ({
      value: [...a.value, b.value],
      original: [...a.original, b.original],
      index: a.index !== undefined && b.index !== undefined ? a.index + b.index * getPrevSizes(idx) : 0
    }))), [{value: [], original: [], index: 0}])
  }

  shrink(initial: FluentPick<A>): Arbitrary<A> {
    return fc.union(...this.arbitraries.map((_, selected) =>
      fc.tuple(...this.arbitraries.map((arbitrary, i) =>
        selected === i ?
          arbitrary.shrink({value: initial.value[i], original: initial.original[i]}) :
          fc.constant(initial.value[i])
      )))) as unknown as Arbitrary<A>
  }

  canGenerate(pick: FluentPick<A>): boolean {
    for (const i in pick.value)
      if (!this.arbitraries[i as number].canGenerate({value: pick.value[i], original: pick.original[i]}))
        return false

    return true
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
