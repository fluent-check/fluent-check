import {
  type Arbitrary,
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
import type {NonEmptyArray, ExactSizeArbitrary} from './types.js'
export {Arbitrary, type HashFunction, type EqualsFunction} from './internal.js'
export {NoArbitrary} from './NoArbitrary.js'

// Helper to assert that an Arbitrary is ExactSizeArbitrary at factory boundaries
const asExact = <A>(arb: Arbitrary<A>): ExactSizeArbitrary<A> => arb as ExactSizeArbitrary<A>
export {exactSize, estimatedSize, mix, stringToHash, doubleToHash, FNV_OFFSET_BASIS} from './util.js'
export {char, hex, base64, ascii, unicode, string} from './string.js'
export {date, time, datetime, duration, timeToMilliseconds} from './datetime.js'
export {regex, patterns, shrinkRegexString} from './regex.js'
export {
  type LawResult,
  type LawCheckOptions,
  samplingLaws,
  shrinkingLaws,
  compositionLaws,
  arbitraryLaws
} from './laws.js'
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

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return asExact(new ArbitraryConstant(min))
  return asExact(new ArbitraryInteger(min, max))
}

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return asExact(new ArbitraryConstant(min))
  return asExact(new ArbitraryReal(min, max))
}

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export function array<A>(arbitrary: ExactSizeArbitrary<A>, min?: number, max?: number): ExactSizeArbitrary<A[]>
export function array<A>(arbitrary: Arbitrary<A>, min?: number, max?: number): Arbitrary<A[]>
export function array<A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> {
  if (min > max) return NoArbitrary
  return new ArbitraryArray(arbitrary, min, max)
}

export const set = <const A extends readonly unknown[]>(
  elements: A, min = 0, max = 10
): ExactSizeArbitrary<A[number][]> => {
  if (min > max || min > elements.length) return NoArbitrary
  return asExact(new ArbitrarySet(Array.from(new Set(elements)), min, max))
}

export const oneof = <const A extends readonly unknown[]>(elements: A): ExactSizeArbitrary<A[number]> => {
  if (elements.length === 0) return NoArbitrary as any
  return integer(0, elements.length - 1).map((i): A[number] => {
    const element = elements[i]
    if (element === undefined) {
      throw new Error(`Index ${i} out of bounds for oneof elements array`)
    }
    return element
  }) as ExactSizeArbitrary<A[number]>
}

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  const filtered = arbitraries.filter(a => a !== NoArbitrary)
  if (filtered.length === 0) return NoArbitrary
  if (filtered.length === 1) {
    const first = filtered[0]
    if (first === undefined) return NoArbitrary
    return first
  }
  // Safe: filtered.length >= 2, so it's a NonEmptyArray
  return new ArbitraryComposite(filtered as NonEmptyArray<Arbitrary<A>>)
}

export const boolean = (): ExactSizeArbitrary<boolean> => asExact(new ArbitraryBoolean())

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): ExactSizeArbitrary<A> => asExact(new ArbitraryConstant(constant))

type UnwrapFluentPick<T> = { -readonly [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <const U extends readonly Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> => {
  if (arbitraries.some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryTuple([...arbitraries]) as Arbitrary<UnwrapFluentPick<U>>
}

type RecordSchema = Record<string, Arbitrary<unknown> | undefined>
type ValidatedSchema<S extends RecordSchema> = { [K in keyof S]-?: NonNullable<S[K]> }
type UnwrapSchema<S extends RecordSchema> =
  { [K in keyof S]: ValidatedSchema<S>[K] extends Arbitrary<infer T> ? T : never }

export const record = <S extends RecordSchema>(schema: S): Arbitrary<UnwrapSchema<S>> => {
  if (Object.values(schema).some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryRecord(schema)
}
