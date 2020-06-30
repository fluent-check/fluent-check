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
    const ccs = [... new Set(((this.min < 0 && this.max > 0) ?
      [0, this.min, Math.round((this.min + this.max) / 2), this.max] :
      [this.min, Math.round((this.min + this.max) / 2), this.max]))]

    return ccs.map(value => ({ value, original: value }))
  }

  shrink(initial: FluentPick<number>): Arbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value - 1)

      if (lower === upper) return NoArbitrary

      return fc.integer(lower, upper)
    } else if (initial.value < 0) {
      const upper = Math.min(0, this.max)
      const lower = Math.min(upper, initial.value + 1)

      if (lower === upper) return NoArbitrary

      return fc.integer(lower, upper)
    }

    return NoArbitrary
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }

  toString(depth = 0) { return ' '.repeat(depth * 2) + `Integer Arbitrary: min = ${this.min} max = ${this.max}`}
}
