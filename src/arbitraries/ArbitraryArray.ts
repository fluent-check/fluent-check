import {FluentPick} from './types'
import {mapArbitrarySize} from './util'
import {Arbitrary} from './internal'
import * as fc from './index'

export class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  sizeUpTo = (v: number, max: number) => {
    return v === 1 ? max + 1 : (1 - v ** (max + 1)) / (1 - v)
  }

  size() {
    // https://en.wikipedia.org/wiki/Geometric_progression#Geometric_series
    return mapArbitrarySize(this.arbitrary.size(), v => {
      const value = this.sizeUpTo(v, this.max) - this.sizeUpTo(v, this.min - 1)
      return {type: 'exact', value, credibleInterval: [value, value]}
    })
  }

  pick(generator: () => number, precision?: number): FluentPick<A[]> | undefined {
    const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    const fpa = this.arbitrary.sample(size, generator, precision)

    const value = fpa.map(v => v.value)
    const original = fpa.map(v => v.original)
    const indexes = fpa.map(v => v.index ?? 0)

    return {
      value,
      original: original.every(o => o === undefined) ? value : original,
      index: this.calculateIndex(indexes, size)
    }
  }

  calculateIndex(indexes: number[], size: number) {
    const arbSize = this.arbitrary.size().credibleInterval[1]
    return indexes.reduce((acc, n, idx) =>
      acc + n * arbSize ** idx,
    this.sizeUpTo(arbSize, size - 1) - this.sizeUpTo(arbSize, this.min - 1))
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

  cornerCases(): FluentPick<A[]>[] {
    return this.arbitrary.cornerCases().flatMap(cc => [
      {value: Array(this.min).fill(cc.value),
        original: Array(this.min).fill(cc.original),
        index: this.calculateIndex(Array(this.min).fill(cc.index), this.min)},
      {value: Array(this.max).fill(cc.value),
        original: Array(this.max).fill(cc.original),
        index: this.calculateIndex(Array(this.max).fill(cc.index), this.max)}
    ]).filter(v => v !== undefined) as FluentPick<A[]>[]
  }

  toString(depth = 0): string {
    return ' '.repeat(depth * 2) +
      `Array Arbitrary: min = ${this.min} max = ${this.max}\n${this.arbitrary.toString(depth + 1)}`
  }
}
