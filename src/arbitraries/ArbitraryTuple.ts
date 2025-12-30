import type {FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary} from './internal.js'
import {combineArbitrarySizes, FNV_OFFSET_BASIS, mix} from './util.js'
import * as fc from './index.js'

type UnwrapArbitrary<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : never }

export class ArbitraryTuple<U extends Arbitrary<any>[], A = UnwrapArbitrary<U>> extends Arbitrary<A> {
  constructor(public readonly arbitraries: U) {
    super()
  }

  override size() {
    return combineArbitrarySizes(this.arbitraries, 'product')
  }

  override pick(generator: () => number): FluentPick<A> | undefined {
    const value: unknown[] = []
    const original: unknown[] = []

    for (const a of this.arbitraries) {
      const pick = a.pick(generator)
      if (pick === undefined) return undefined
      else {
        value.push(pick.value)
        original.push(pick.original)
      }
    }

    return {value: value as A, original}
  }

  override cornerCases(): FluentPick<A>[] {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    return cornerCases.reduce((acc, cc) => acc.flatMap(a => cc.map(b => ({
      value: [...(a.value as unknown[]), b.value],
      original: [...(a.original as unknown[]), b.original]
    }))), [{value: [] as unknown[], original: [] as unknown[]}]) as FluentPick<A>[]
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

    return this.arbitraries.every((arbitrary, i) => {
      const val = value[i]
      const orig = original[i]
      return (val !== undefined && arbitrary?.canGenerate({value: val, original: orig})) ?? false
    })
  }

  /** Composes element hashes to create tuple hash */
  override hashCode(): HashFunction {
    const elementHashes = this.arbitraries.map(a => a.hashCode())
    return (tuple: unknown): number => {
      const arr = tuple as unknown[]
      let hash = FNV_OFFSET_BASIS
      for (const [i, hashFn] of elementHashes.entries()) {
        if (hashFn === undefined) continue
        const element = arr[i]
        if (element !== undefined) {
          hash = mix(hash, hashFn(element))
        }
      }
      return hash
    }
  }

  /** Composes element equality for tuple comparison */
  override equals(): EqualsFunction {
    const elementEquals = this.arbitraries.map(a => a.equals())
    return (a: unknown, b: unknown): boolean => {
      const arrA = a as unknown[]
      const arrB = b as unknown[]
      if (arrA.length !== arrB.length) return false
      return elementEquals.every((eqFn, i) => {
        if (eqFn === undefined) return true
        const valA = arrA[i]
        const valB = arrB[i]
        return valA !== undefined && valB !== undefined && eqFn(valA, valB)
      })
    }
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
