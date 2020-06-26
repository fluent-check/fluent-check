import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary, NoArbitrary } from './internal'
import * as fc from './index'

export class ArbitraryInteger extends Arbitrary<number> {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
    this.min = min
    this.max = max
  }

  size(): ArbitrarySize { return { value: this.max - this.min + 1, type: 'exact' } }

  pick() {
    const value = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    return { value, original: value }
  }

  cornerCases() {
    return (this.min < 0 && this.max > 0) ?
      [{ value: 0 }, { value: this.min }, { value: this.max }] :
      [{ value: this.min }, { value: this.max }]
  }

  shrink(initial: FluentPick<number>): Arbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value! - 1)
      const midpoint = Math.floor((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return fc.union(fc.integer(lower, midpoint - 1), fc.integer(midpoint, upper))
    } else if (initial.value! < 0) {
      const upper = Math.min(0, this.max)
      const lower = Math.min(upper, initial.value! + 1)
      const midpoint = Math.ceil((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return fc.union(fc.integer(midpoint, upper), fc.integer(lower, midpoint - 1))
    }

    return NoArbitrary
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }

  toString(depth = 0) { return ' '.repeat(depth * 2) + `Integer Arbitrary: min = ${this.min} max = ${this.max}`}
}
