import * as fc from './index'
import * as util from './util'
import {ArbitrarySize, FluentPick} from './types'
import {Arbitrary, NoArbitrary} from './internal'

const MAX_VALUE_MUTATOR = 3
const MAX_ARITHMETIC_OP = 3

export class ArbitraryInteger extends Arbitrary<number> {

  /**
   * Function responsible for generating valid arbitrary values.
   */
  protected generate: Function

  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
    this.generate = util.getRandomInt
  }

  size(): ArbitrarySize {
    const value = this.max - this.min + 1
    return {value, type: 'exact', credibleInterval: [value, value]}
  }

  pick(generator: () => number) {
    const value = this.generate(this.min, this.max, generator)
    return {value, original: value}
  }

  cornerCases() {
    const middle = Math.round((this.min + this.max) / 2)
    const ccs = [... new Set(this.min < 0 && this.max > 0 ?
      [0, this.min, middle, this.max] : [this.min, middle, this.max])]
      .sort((a,b) => Math.abs(a) - Math.abs(b))

    return ccs.map(value => ({value, original: value}))
  }

  shrink(initial: FluentPick<number>): Arbitrary<number> {
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

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }

  mutate(pick: FluentPick<number>, generator: () => number, maxNumMutations: number): FluentPick<number>[] {
    const valueMutator = [
      (_: () => number, value: number)         => value,
      (generator: () => number, _: number)     => this.generate(this.min, this.max, generator),
      (generator: () => number, value: number) => this.generate(this.min, value, generator),
      (generator: () => number, value: number) => this.generate(value, this.max, generator),
    ]

    const result: FluentPick<number>[] = []
    let numMutations = util.getRandomInt(1, maxNumMutations, generator)

    while (numMutations-- >= 1) {
      const newValue = valueMutator[util.getRandomInt(0, MAX_VALUE_MUTATOR, generator)](generator, pick.value)

      switch (util.getRandomInt(0, MAX_ARITHMETIC_OP, generator)) {
        case 0: // Addition
          result.push({
            value: Math.min(this.max, pick.value + newValue),
            original: Math.min(this.max, pick.original + newValue)
          })
          break
        case 1: // Subtraction
          result.push({
            value: Math.max(this.min, pick.value - newValue),
            original: Math.max(this.min, pick.original - newValue)
          })
          break
        case 2: // Multiplication
          result.push({
            value: Math.min(this.max, pick.value * newValue),
            original: Math.min(this.max, pick.original * newValue)
          })
          break
        case 3: // Division
          result.push({
            value: newValue === 0 ? 0 : Math.max(this.min, Math.floor(pick.value / newValue)),
            original: newValue === 0 ? 0 : Math.max(this.min, Math.floor(pick.original / newValue))
          })
          break
      }
    }

    return result.reduce((acc, pick) => {
      if (this.canGenerate(pick) && acc.every(x => x.value !== pick.value)) acc.push(pick)
      return acc
    }, [] as FluentPick<number>[])
  }

  toString(depth = 0) { return ' '.repeat(depth * 2) + `Integer Arbitrary: min = ${this.min} max = ${this.max}` }
}
