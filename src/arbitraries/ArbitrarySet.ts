import type {FluentPick, ExactSize} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {exactSize, FNV_OFFSET_BASIS, mix} from './util.js'
import {factorial} from '../statistics.js'
import * as fc from './index.js'

export class ArbitrarySet<A> extends Arbitrary<A[]> {
  readonly max: number

  constructor(public readonly elements: A[], public readonly min = 0, max = 10) {
    super()
    this.max = Math.min(max, elements.length)
  }

  override size(): ExactSize {
    const comb = (n: number, s: number) => { return factorial (n) / (factorial(s) * factorial(n - s)) }

    let value = 0
    for (let i = this.min; i <= this.max; i++) value += comb(this.elements.length, i)

    return exactSize(value)
  }

  override pick(generator: () => number): FluentPick<A[]> | undefined {
    const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    const pick = new Set<A>()

    // Fail fast when a non-empty set is requested but there are no source elements
    if (size > 0 && this.elements.length === 0) {
      throw new Error('Cannot pick non-empty set from empty elements')
    }

    while (pick.size !== size) {
      const index = Math.floor(generator() * this.elements.length)
      const element = this.elements[index]
      if (element === undefined) {
        continue
      }
      pick.add(element)
    }

    const value = Array.from(pick).toSorted()

    return {value, original: value}
  }

  override shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.set(this.elements, start, middle), fc.set(this.elements, middle + 1, end))
  }

  override canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every(v => this.elements.includes(v))
  }

  override cornerCases(): FluentPick<A[]>[] {
    const min = this.elements.slice(0, this.min)
    const max = this.elements.slice(0, this.max)
    return [{value: min, original: min}, {value: max, original: max}]
  }

  /** Order-independent set hash - XORs element hashes */
  override hashCode(): HashFunction {
    // For sets, use XOR which is commutative (order-independent)
    // Since elements is A[] (not Arbitrary<A>), we use the default hash from base class
    // which handles primitives and objects via stringify
    return (arr: unknown): number => {
      const a = arr as A[]
      let hash = FNV_OFFSET_BASIS
      hash = mix(hash, a.length)
      // Use XOR for order-independence, with element index as secondary factor
      let elemHash = 0
      for (const elem of a) {
        // Simple hash for elements - works for primitives which sets typically contain
        let elemVal = 0
        if (typeof elem === 'number') {
          elemVal = elem | 0
        } else if (typeof elem === 'string' && elem.length > 0) {
          elemVal = elem.charCodeAt(0)
        } else if (typeof elem === 'boolean') {
          elemVal = elem ? 1 : 0
        }
        elemHash ^= elemVal
      }
      hash = mix(hash, elemHash)
      return hash
    }
  }

  /** Order-independent set equality - compares sorted arrays */
  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => {
      const arrA = a as A[]
      const arrB = b as A[]
      if (arrA.length !== arrB.length) return false
      // Sets are already sorted in pick(), so direct comparison works
      return arrA.every((value, i) => value === arrB[i])
    }
  }

  override toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Set Arbitrary: min = ${this.min} max = ${this.max} elements = [${this.elements.join(', ')}]`
  }
}
