import type {FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {mapArbitrarySize, exactSize, FNV_OFFSET_BASIS, mix} from './util.js'
import {Arbitrary} from './internal.js'
import * as fc from './index.js'

export class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  override size() {
    // https://en.wikipedia.org/wiki/Geometric_progression#Geometric_series
    const sizeUpTo = (v: number, max: number) => {
      return v === 1 ? max + 1 : (1 - v ** (max + 1)) / (1 - v)
    }
    return mapArbitrarySize(this.arbitrary.size(), v => {
      const value = sizeUpTo(v, this.max) - sizeUpTo(v, this.min - 1)
      return exactSize(value)
    })
  }

  override pick(generator: () => number): FluentPick<A[]> | undefined {
    const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    const fpa = this.arbitrary.sample(size)

    const value = fpa.map(v => v.value)
    const original = fpa.map(v => v.original)

    return {
      value,
      original: original.every(o => o === undefined) ? value : original
    }
  }

  override shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.array(this.arbitrary, start, middle), fc.array(this.arbitrary, middle + 1, end))
  }

  override canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every((v, i) => this.arbitrary.canGenerate({value: v, original: pick.original[i]}))
  }

  override cornerCases(): FluentPick<A[]>[] {
    // flatMap always produces defined values, so no filter needed
    return this.arbitrary.cornerCases().flatMap(cc => [
      {value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original)},
      {value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original)}
    ])
  }

  /** Composes element hash with length to create array hash */
  override hashCode(): HashFunction {
    const elementHash = this.arbitrary.hashCode()
    return (arr: unknown): number => {
      const a = arr as A[]
      let hash = FNV_OFFSET_BASIS
      hash = mix(hash, a.length)
      for (const elem of a) {
        hash = mix(hash, elementHash(elem))
      }
      return hash
    }
  }

  /** Composes element equality for array comparison */
  override equals(): EqualsFunction {
    const elementEquals = this.arbitrary.equals()
    return (a: unknown, b: unknown): boolean => {
      const arrA = a as A[]
      const arrB = b as A[]
      if (arrA.length !== arrB.length) return false
      return arrA.every((value, i) => elementEquals(value, arrB[i]))
    }
  }

  override toString(depth = 0): string {
    return ' '.repeat(depth * 2) +
      `Array Arbitrary: min = ${this.min} max = ${this.max}\n${this.arbitrary.toString(depth + 1)}`
  }
}
