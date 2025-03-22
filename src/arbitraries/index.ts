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
export {Arbitrary} from './internal.js'
export {char, hex, base64, ascii, unicode, string} from './string.js'

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : min === max ? new ArbitraryConstant(min) as unknown as Arbitrary<number> : new ArbitraryInteger(min, max) as unknown as Arbitrary<number>

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : min === max ? new ArbitraryConstant(min) as unknown as Arbitrary<number> : new ArbitraryReal(min, max) as unknown as Arbitrary<number>

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> =>
  min > max ? NoArbitrary : new ArbitraryArray(arbitrary, min, max) as unknown as Arbitrary<A[]>

export const set = <A>(elements: A[], min = 0, max = 10): Arbitrary<A[]> =>
  min > max || min > elements.length ? NoArbitrary : new ArbitrarySet(Array.from(new Set(elements)), min, max) as unknown as Arbitrary<A[]>

export const oneof = <A>(elements: A[]): Arbitrary<A> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  arbitraries = arbitraries.filter(a => a !== NoArbitrary)
  return arbitraries.length === 0 ? NoArbitrary :
    arbitraries.length === 1 ? arbitraries[0] : new ArbitraryComposite(arbitraries) as unknown as Arbitrary<A>
}

export const boolean = (): Arbitrary<boolean> => new ArbitraryBoolean() as unknown as Arbitrary<boolean>

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant) as unknown as Arbitrary<A>

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <U extends Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> =>
  arbitraries.some(a => a === NoArbitrary) ? NoArbitrary : new ArbitraryTuple(arbitraries) as unknown as Arbitrary<UnwrapFluentPick<U>>
