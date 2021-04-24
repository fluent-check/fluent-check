import * as fc from './index'
import * as util from './util'
import {Arbitrary} from './internal'
import {factorial} from '../statistics'
import {FluentPick, ArbitrarySize} from './types'

export class ArbitrarySet<A> extends Arbitrary<A[]> {
  readonly max: number

  constructor(public readonly elements: A[], public readonly min = 0, max = 10) {
    super()
    this.max = Math.min(max, elements.length)
  }

  size(): ArbitrarySize {
    const comb = (n: number, s: number) => { return factorial (n) / (factorial(s) * factorial(n - s)) }

    let size = 0
    for (let i = this.min; i <= this.max; i++) size += comb(this.elements.length, i)

    return {value: size, type: 'exact', credibleInterval: [size, size]}
  }

  pick(generator: () => number): FluentPick<A[]> | undefined {
    const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    const pick = new Set<A>()

    while (pick.size !== size)
      pick.add(this.elements[Math.floor(generator() * this.elements.length)])

    const value = Array.from(pick).sort()

    return {value, original: value}
  }

  shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.set(this.elements, start, middle), fc.set(this.elements, middle + 1, end))
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           util.distinct(pick.value) === pick.value.length &&
           pick.value.every(v => this.elements.includes(v))
  }

  mutate(_: FluentPick<A[]>, generator: () => number, maxNumMutations: number): FluentPick<A[]>[] {
    const result: FluentPick<A[]>[] = []

    const arbitrarySize = this.size()
    const numMutations = arbitrarySize.type === 'exact' ?
      Math.min(arbitrarySize.value - 1, util.getRandomInt(1, maxNumMutations, generator)) :
      util.getRandomInt(1, maxNumMutations, generator)

    while (result.length < numMutations) {
      const mutatedPick = this.pick(generator)
      if (mutatedPick !== undefined && result.every(x => x.value !== mutatedPick.value)) result.push(mutatedPick)
    }

    return result
  }

  cornerCases(): FluentPick<A[]>[] {
    const min: A[] = []
    for (let i = 0; i < this.min; i++) min.push(this.elements[i])

    const max: A[] = []
    for (let i = 0; i < this.max; i++) max.push(this.elements[i])

    return [{value: min, original: min}, {value: max, original: max}]
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Set Arbitrary: min = ${this.min} max = ${this.max} elements = [${this.elements.join(', ')}]`
  }
}
