import * as fc from './index'
import * as util from './util'
import {ArbitrarySize, FluentPick} from './types'
import {Arbitrary, NoArbitrary} from './internal'

const MAX_VALUE_MUTATOR = 2
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
    return pick.value >= this.min && pick.value <= this.max && Number.isInteger(pick.value)
  }

  mutate(pick: FluentPick<number>, generator: () => number, maxNumMutations: number): FluentPick<number>[] {
    const result: FluentPick<number>[] = []
    const numMutations = util.computeNumMutations(this.size(), generator, maxNumMutations)

    const valueMutator = [
      (generator: () => number, _: number)     => this.generate(0, this.max - this.min, generator),
      (generator: () => number, value: number) => this.generate(0, value - this.min, generator),
      (generator: () => number, value: number) => this.generate(0, this.max - value, generator),
    ]

    while (result.length < numMutations) {
      let newValue = valueMutator[util.getRandomInt(0, MAX_VALUE_MUTATOR, generator)](generator, pick.value)
      switch (util.getRandomInt(0, MAX_ARITHMETIC_OP, generator)) {
        case 0: // Addition
          newValue = Math.min(this.max, pick.value + newValue)
          break
        case 1: // Subtraction
          newValue = Math.max(this.min, pick.value - newValue)
          break
        case 2: // Multiplication
          newValue = Math.min(this.max, pick.value * newValue)
          break
        case 3: // Division
          newValue = newValue === 0 ? 0 : Math.max(this.min, Math.floor(pick.value / newValue))
          break
      }
      const mutatedPick: FluentPick<number> = {value: newValue, original: newValue}
      if (this.canGenerate(mutatedPick)
      && pick.value !== mutatedPick.value
      && result.every(x => x.value !== mutatedPick.value)) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) { return ' '.repeat(depth * 2) + `Integer Arbitrary: min = ${this.min} max = ${this.max}` }
}
