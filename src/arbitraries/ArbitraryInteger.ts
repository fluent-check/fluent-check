import type {ExactSize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {Arbitrary, NoArbitrary} from './internal.js'
import {exactSize} from './util.js'
import * as fc from './index.js'

export class ArbitraryInteger extends Arbitrary<number> {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
  }

  override size(): ExactSize {
    return exactSize(this.max - this.min + 1)
  }

  override pick(generator: () => number) {
    const value = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    return {value, original: value}
  }

  override cornerCases() {
    const middle = Math.round((this.min + this.max) / 2)
    const ccs = [... new Set(this.min < 0 && this.max > 0 ?
      [0, this.min, middle, this.max] : [this.min, middle, this.max])]
      .toSorted((a,b) => Math.abs(a) - Math.abs(b))

    return ccs.map(value => ({value, original: value}))
  }

  override shrink(initial: FluentPick<number>): Arbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = initial.value - 1

      if (upper < lower) return NoArbitrary

      return fc.integer(lower, upper)
    } else if (initial.value < 0) {
      const upper = Math.min(0, this.max)
      const lower = initial.value + 1

      if (lower > upper) return NoArbitrary

      return fc.integer(lower, upper)
    }

    return NoArbitrary
  }

  override canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }

  /** Efficient integer hash - uses identity (truncated to 32-bit) */
  override hashCode(): HashFunction {
    return (v: unknown): number => (v as number) | 0
  }

  /** Efficient integer equality - uses strict equality */
  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => a === b
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) + `Integer Arbitrary: min = ${this.min} max = ${this.max}`
  }
}
