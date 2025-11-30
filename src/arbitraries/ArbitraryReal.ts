import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {ArbitraryInteger} from './internal.js'
import {doubleToHash} from './util.js'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  override pick(generator: () => number)  {
    const value = generator() * (this.max - this.min) + this.min
    return {value, original: value}
  }

  /** Efficient double hash - handles NaN and -0 properly */
  override hashCode(): HashFunction {
    return (v: unknown): number => doubleToHash(v as number)
  }

  /** Efficient double equality - uses Object.is to handle NaN and -0 */
  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => Object.is(a, b)
  }
}
