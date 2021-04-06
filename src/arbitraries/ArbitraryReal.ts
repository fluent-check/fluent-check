import {ArbitraryInteger} from './internal'
import {ArbitrarySize} from './types'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  size(precision = 0): ArbitrarySize {
    const value = (this.max - this.min + 1) * 10 ** precision
    return {value, type: 'exact', credibleInterval: [value, value]}
  }

  pick(generator: () => number)  {
    const value = generator() * (this.max - this.min) + this.min
    return {value, original: value}
  }

  calculateCoverage(picks: number, precision: number): number {
    return picks/this.size(precision).value
  }
}
