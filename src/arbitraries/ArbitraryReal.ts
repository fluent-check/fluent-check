import {ArbitraryInteger} from './internal'
import { ArbitrarySize } from './types'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  size(): ArbitrarySize {
    const value = Number.MAX_SAFE_INTEGER
    return {value, type: 'exact', credibleInterval: [value, value]}
  }

  pick(generator: () => number)  {
    const value = generator() * (this.max - this.min) + this.min
    return {value, original: value}
  }
}
