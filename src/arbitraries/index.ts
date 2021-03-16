import * as utils from './util'
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
  NoArbitrary,
} from './internal'

export * from './types'
export {Arbitrary} from './internal'

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryInteger(min, max))

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryReal(min, max))

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export const char = (): Arbitrary<string> =>
  new ArbitraryInteger(0x20, 0x7e).map((v) => String.fromCodePoint(v))

export const hex = (): Arbitrary<string> =>
  new ArbitraryInteger(0, 15).map((v) => String.fromCodePoint(v < 10 ? v + 48 : v + 97 - 10))

export const base64 = (): Arbitrary<string> =>
  new ArbitraryInteger(0, 63).map((v) => String.fromCodePoint(utils.base64Mapper(v)))

export const ascii = (): Arbitrary<string> =>
  new ArbitraryInteger(0x00, 0x7f).map((v) => String.fromCodePoint(utils.printableCharactersMapper(v)))

export const unicode = (encoding = 'utf-8'): Arbitrary<string> => encoding === 'utf-16' ?
  new ArbitraryInteger(0x0000, 0x10ffff).map((v) => String.fromCodePoint(utils.printableCharactersMapper(v))) :
  new ArbitraryInteger(0x0000, 0x10f7ff).map((v) => String.fromCodePoint(utils.utf8Mapper(v)))

export const string = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz'): Arbitrary<string> =>
  chars === '' ? constant('') : array(integer(0, chars.length - 1).map(n => chars[n]), min, max).map(a => a.join(''))

// export const string = (min = 2, max = 10, charArb = char()): Arbitrary<string> =>
//   min > max ? NoArbitrary : array(charArb, min, max).map(a => a.join(''))

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> =>
  min > max ? NoArbitrary : new ArbitraryArray(arbitrary, min, max)

export const set = <A>(elements: A[], min = 0, max = 10): Arbitrary<A[]> =>
  min > max || min > elements.length ? NoArbitrary : new ArbitrarySet(Array.from(new Set(elements)), min, max)

export const oneof = <A>(elements: A[]): Arbitrary<A> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  arbitraries = arbitraries.filter(a => a !== NoArbitrary)
  return arbitraries.length === 0 ? NoArbitrary :
    (arbitraries.length === 1 ? arbitraries[0] : new ArbitraryComposite(arbitraries))
}

export const boolean = (): Arbitrary<boolean> => new ArbitraryBoolean()

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant)

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <U extends Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> =>
  arbitraries.some(a => a === NoArbitrary) ? NoArbitrary : new ArbitraryTuple(arbitraries)
