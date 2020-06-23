import { ArbitraryInteger } from './internal'
import { Picker } from './Picker'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  picker(): Picker<number> {
    return new Picker(() => ({ value: Math.random() * (this.max - this.min) + this.min }))
  }
}
