// -----------------------------
// ----- Arbitrary Builders ----
// -----------------------------

import { Arbitrary } from './types'
import {
  ArbitraryArray,
  ArbitraryBoolean,
  ArbitraryComposite,
  ArbitraryInteger,
  ArbitraryReal,
  ArbitraryString,
  BaseArbitrary,
  NoArbitrary
} from './internal'

export * from './types'

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  new ArbitraryInteger(min, max)

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  new ArbitraryReal(min, max)

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  new ArbitraryInteger(min, max)

export const string = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz'): Arbitrary<string> =>
  new ArbitraryString(min, max, chars)

export const array = <A>(arbitrary: BaseArbitrary<A>, min = 0, max = 10): Arbitrary<A[]> =>
  new ArbitraryArray(arbitrary, min, max)

export const union = <A>(...arbitraries: BaseArbitrary<A>[]): Arbitrary<A> =>
  new ArbitraryComposite(arbitraries)

export const boolean = (): Arbitrary<boolean> =>
  new ArbitraryBoolean()

export const empty = (): Arbitrary<never> =>
  NoArbitrary
