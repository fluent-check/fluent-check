import {
  Arbitrary,
  ArbitraryArray,
  ArbitrarySet,
  ArbitraryBoolean,
  ArbitraryConstant,
  ArbitraryComposite,
  ArbitraryTuple,
  ArbitraryInteger,
  ArbitraryReal,
  NoArbitrary
} from './internal.js'

export * from './types.js'
import type {EstimatedSizeArbitrary, ExactSizeArbitrary} from './types.js'
export {Arbitrary, NoArbitrary} from './internal.js'
export {exactSize, estimatedSize} from './util.js'
export {char, hex, base64, ascii, unicode, string} from './string.js'
export {date, time, datetime, duration, timeToMilliseconds} from './datetime.js'
export {regex, patterns, shrinkRegexString} from './regex.js'
export {
  positiveInt,
  negativeInt,
  nonZeroInt,
  byte,
  nonEmptyString,
  nonEmptyArray,
  pair,
  nullable,
  optional
} from './presets.js'

// Type assertion helper - safe because runtime implementations return correct size types
export const asExact = <A>(arb: Arbitrary<A>): ExactSizeArbitrary<A> => arb as ExactSizeArbitrary<A>
export const asEstimated = <A>(arb: Arbitrary<A>): EstimatedSizeArbitrary<A> => arb as EstimatedSizeArbitrary<A>

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return constant(min)
  return asExact(new ArbitraryInteger(min, max))
}

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return constant(min)
  return asExact(new ArbitraryReal(min, max))
}

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): ExactSizeArbitrary<A[]> => {
  if (min > max) return NoArbitrary
  return asExact(new ArbitraryArray(arbitrary, min, max))
}

export const set = <const A extends readonly unknown[]>(elements: A, min = 0, max = 10): ExactSizeArbitrary<A[number][]> => {
  if (min > max || min > elements.length) return NoArbitrary
  return asExact(new ArbitrarySet(Array.from(new Set(elements)), min, max))
}

export const oneof = <const A extends readonly unknown[]>(elements: A): ExactSizeArbitrary<A[number]> =>
  elements.length === 0 ? NoArbitrary : asExact(integer(0, elements.length - 1).map(i => elements[i]))

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  const filtered = arbitraries.filter(a => a !== NoArbitrary)
  if (filtered.length === 0) return NoArbitrary
  if (filtered.length === 1) return filtered[0]
  return new ArbitraryComposite(filtered)
}

export const boolean = (): ExactSizeArbitrary<boolean> => asExact(new ArbitraryBoolean())

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): ExactSizeArbitrary<A> => asExact(new ArbitraryConstant(constant))

type UnwrapFluentPick<T> = { -readonly [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <const U extends readonly Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> => {
  if (arbitraries.some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryTuple([...arbitraries]) as Arbitrary<UnwrapFluentPick<U>>
}
