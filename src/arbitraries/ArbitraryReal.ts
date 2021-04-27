import {ArbitraryInteger} from './internal'
import {ArbitrarySize} from './types'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  size(precision?: number): ArbitrarySize {
    const value = precision === undefined ? Number.MAX_SAFE_INTEGER : 1 + (this.max - this.min) * 10 ** precision
    return {value, type: 'exact', credibleInterval: [value, value]}
  }

  pick(generator: () => number, precision?: number)  {
    const value = generator() * (this.max - this.min) + this.min
    const index = precision !== undefined ? Math.floor(value * 10 ** precision) : value
    return {value, original: value, index}
  }

  calculateCoverage(picks: number, precision: number): number {
    return picks/this.size(precision).value
  }
}
