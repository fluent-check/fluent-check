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
  ArbitraryRecord,
  NoArbitrary
} from './internal.js'

export * from './types.js'
export {Arbitrary} from './internal.js'
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

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return new ArbitraryConstant(min)
  return new ArbitraryInteger(min, max)
}

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return new ArbitraryConstant(min)
  return new ArbitraryReal(min, max)
}

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> => {
  if (min > max) return NoArbitrary
  return new ArbitraryArray(arbitrary, min, max)
}

export const set = <const A extends readonly unknown[]>(elements: A, min = 0, max = 10): Arbitrary<A[number][]> => {
  if (min > max || min > elements.length) return NoArbitrary
  return new ArbitrarySet(Array.from(new Set(elements)), min, max)
}

export const oneof = <const A extends readonly unknown[]>(elements: A): Arbitrary<A[number]> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  const filtered = arbitraries.filter(a => a !== NoArbitrary)
  if (filtered.length === 0) return NoArbitrary
  if (filtered.length === 1) return filtered[0]
  return new ArbitraryComposite(filtered)
}

export const boolean = (): Arbitrary<boolean> => new ArbitraryBoolean()

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant)

type UnwrapFluentPick<T> = { -readonly [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <const U extends readonly Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> => {
  if (arbitraries.some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryTuple([...arbitraries]) as Arbitrary<UnwrapFluentPick<U>>
}

type RecordSchema = Record<string, Arbitrary<unknown>>
type UnwrapSchema<S extends RecordSchema> = { [K in keyof S]: S[K] extends Arbitrary<infer T> ? T : never }

export const record = <S extends RecordSchema>(schema: S): Arbitrary<UnwrapSchema<S>> => {
  if (Object.values(schema).some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryRecord(schema)
}
