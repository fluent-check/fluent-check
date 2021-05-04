import {ArbitraryInteger} from './internal'
import {ArbitrarySize, FluentPick} from './types'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  size(precision?: number): ArbitrarySize {
    const value = precision === undefined ? Number.MAX_SAFE_INTEGER : 1 + (this.max - this.min) * 10 ** precision
    return {value, type: 'exact', credibleInterval: [value, value]}
  }

  pick(generator: () => number)  {
    const value = generator() * (this.max - this.min) + this.min
    return {value, original: value}
  }

  calculateIndex(pick: FluentPick<any>, precision: number) {
    return Math.floor((pick.original - this.min) * 10 ** precision)
  }

  calculateCoverage(picks: number, precision: number): number {
    return picks/this.size(precision).value
  }
}
