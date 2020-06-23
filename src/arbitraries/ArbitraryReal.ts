import { ArbitraryInteger } from './internal'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  pick() { return { value: Math.random() * (this.max - this.min) + this.min } }
}