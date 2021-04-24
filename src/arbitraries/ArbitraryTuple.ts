import * as fc from './index'
import * as util from './util'
import {Arbitrary} from './internal'
import {ArbitrarySize, FluentPick} from './types'

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

    // TODO: fix credible interval
    return {value, type, credibleInterval: [value, value]}
  }

  pick(generator: () => number): FluentPick<A> | undefined {
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

  cornerCases(): FluentPick<A>[] {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    return cornerCases.reduce((acc, cc) => acc.flatMap(a => cc.map(b => ({
      value: [...a.value, b.value],
      original: [...a.original, b.original]
    }))), [{value: [], original: []}])
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

  mutate(pick: FluentPick<A>, generator: () => number, maxNumMutations: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    const numMutations = util.computeNumMutations(this.size(), generator, maxNumMutations)

    while (result.length < numMutations) {
      const value: any = []
      const original: any[] = []

      for (const i in pick.value) {
        const partial = this.arbitraries[i as number].mutate({
          value: pick.value[i as number],
          original: pick.original[i as number]
        }, generator, 1)

        value.push(partial.length === 0 ? pick.value[i as number] : partial[0].value)
        original.push(partial.length === 0 ? pick.original[i as number] : partial[0].original)
      }

      const mutatedPick: FluentPick<A> = {value, original}
      if (this.canGenerate(mutatedPick) && result.every(x => x.value !== mutatedPick.value)) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
