import * as util from './util'
import {FluentPick} from './types'
import {ArbitraryInteger} from './internal'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
    this.generate = util.getRandomNumber
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }

  toString(depth = 0) { return ' '.repeat(depth * 2) + `Real Arbitrary: min = ${this.min} max = ${this.max}` }
}
