import * as fc from './index'
import * as util from './util'
import {Arbitrary} from './internal'
import {ArbitrarySize, FluentPick} from './types'
import {computeCombinations} from '../strategies/mixins/utils'
import {StrategyExtractedConstants} from '../strategies/FluentStrategyTypes'

type UnwrapArbitrary<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : never }

const MAX_TUPLE_OP = 2

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

  extractedConstants(constants: StrategyExtractedConstants): FluentPick<A>[] {
    const extractedConstants: FluentPick<A>[] = []
    let K = this.arbitraries[0].extractedConstants(constants)
    let V = this.arbitraries[1].extractedConstants(constants)

    if (K.length === 0 && V.length === 0) return extractedConstants
    else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      K = K.length === 0 ? [this.arbitraries[0].pick(Math.random)!] : K
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      V = V.length === 0 ? [this.arbitraries[1].pick(Math.random)!] : V
    }

    computeCombinations([K, V]).forEach(elem => {
      extractedConstants.push({
        value: [elem[0].value, elem[1].value] as any,
        original: [elem[0].original, elem[1].original] as any[]
      })
    })

    return extractedConstants.filter(x => this.canGenerate(x))
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

      const mutationID = util.getRandomInt(0, MAX_TUPLE_OP, generator)
      switch (mutationID) {
        case 0:
        case 1:
          // eslint-disable-next-line no-case-declarations
          const partial = this.arbitraries[mutationID].mutate({
            value: pick.value[mutationID],
            original: pick.original[mutationID]
          }, generator, 1)

          value.push(... partial.length === 0 ? pick.value as any :
            mutationID === 0 ? [partial[0].value, pick.value[1]] : [pick.value[0], partial[0].value])
          original.push(... partial.length === 0 ? pick.original as any :
            mutationID === 0 ? [partial[0].original, pick.original[1]] : [pick.original[0], partial[0].original])
          break
        case 2:
          for (const i in pick.value) {
            const partial = this.arbitraries[i as number].mutate({
              value: pick.value[i as number],
              original: pick.original[i as number]
            }, generator, 1)

            value.push(partial.length === 0 ? pick.value[i as number] : partial[0].value)
            original.push(partial.length === 0 ? pick.original[i as number] : partial[0].original)
          }
          break
      }

      const mutatedPick: FluentPick<A> = {value, original}
      if (this.canGenerate(mutatedPick)
      && JSON.stringify(pick.value) !== JSON.stringify(mutatedPick.value)
      && result.every(x => JSON.stringify(x.value) !== JSON.stringify(mutatedPick.value))) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
