import * as fc from './index'
import * as util from './util'

import {FluentPick} from './types'
import {mapArbitrarySize} from './util'
import {Arbitrary} from './internal'
import {StrategyExtractedConstants} from '../strategies/FluentStrategyTypes'

export class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    // https://en.wikipedia.org/wiki/Geometric_progression#Geometric_series
    const sizeUpTo = (v: number, max: number) => {
      return v === 1 ? max + 1 : (1 - v ** (max + 1)) / (1 - v)
    }
    return mapArbitrarySize(this.arbitrary.size(), v => {
      const value = sizeUpTo(v, this.max) - sizeUpTo(v, this.min - 1)
      return {type: 'exact', value, credibleInterval: [value, value]}
    })
  }

  pick(generator: () => number): FluentPick<A[]> | undefined {
    const size = util.getRandomInt(this.min, this.max, generator)
    const fpa = this.arbitrary.sample(size, [], generator)

    const value = fpa.map(v => v.value)
    const original = fpa.map(v => v.original)

    return {
      value,
      original: original.every(o => o === undefined) ? value : original
    }
  }

  shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.array(this.arbitrary, start, middle), fc.array(this.arbitrary, middle + 1, end))
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every((v, i) => this.arbitrary.canGenerate({value: v, original: pick.original[i]}))
  }

  mutate(pick: FluentPick<A[]>, generator: () => number, maxNumMutations: number): FluentPick<A[]>[] {
    const result: FluentPick<A[]>[] = []
    const numMutations = util.computeNumMutations(this.size(), generator, maxNumMutations)

    while (result.length < numMutations) {
      const mutatedPick: FluentPick<A[]> = {value: [], original: []}
      const mutatedPickSize = util.getRandomBoolean(generator) ?
        pick.value.length : util.getRandomInt(this.min, this.max, generator)

      for (let i = 0; i < mutatedPickSize; i++) {
        let newPick: FluentPick<A> = {value: pick.value[i], original: pick.original[i]}
        if (i < pick.value.length && util.getRandomBoolean(generator))
          newPick = this.arbitrary.mutate({value: pick.value[i], original: pick.original[i]},generator,1)[0] ?? newPick
        else if (i >= pick.value.length)
          newPick = this.arbitrary.pick(generator) ?? newPick

        mutatedPick.value.push(newPick.value)
        mutatedPick.original.push(newPick.original)
      }
      if (this.canGenerate(mutatedPick)
      && JSON.stringify(pick.value) !== JSON.stringify(mutatedPick.value)
      && result.every(x => JSON.stringify(x.value) !== JSON.stringify(mutatedPick.value))) result.push(mutatedPick)
    }
    return result
  }

  cornerCases(): FluentPick<A[]>[] {
    return this.arbitrary.cornerCases().flatMap(cc => [
      {value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original)},
      {value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original)}
    ]).filter(v => v !== undefined) as FluentPick<A[]>[]
  }

  extractedConstants(constants: StrategyExtractedConstants): FluentPick<A[]>[] {
    const baseArbitraryConstants = this.arbitrary.extractedConstants(constants)
    return baseArbitraryConstants.reduce((acc, val, idx) => {
      let j = idx
      const tmpArr: FluentPick<A[]> = {value: [], original: []}

      while (tmpArr.value.length < baseArbitraryConstants.length) {
        tmpArr.value.push(baseArbitraryConstants[j].value)
        tmpArr.original.push(baseArbitraryConstants[j].original)
        j = j + 1 === baseArbitraryConstants.length ? 0 : j + 1
      }

      if (tmpArr.value.length < this.min) {
        tmpArr.value.push(... Array(this.min - tmpArr.value.length).fill(tmpArr.value[tmpArr.value.length - 1]))
        tmpArr.original.push(... Array(this.min - tmpArr.value.length).fill(tmpArr.original[tmpArr.value.length - 1]))
      }

      acc.push(tmpArr)
      return acc
    }, [] as FluentPick<A[]>[])
  }

  toString(depth = 0): string {
    return ' '.repeat(depth * 2) +
      `Array Arbitrary: min = ${this.min} max = ${this.max}\n${this.arbitrary.toString(depth + 1)}`
  }
}
