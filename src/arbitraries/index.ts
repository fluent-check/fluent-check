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
  ArbitraryString,
  NoArbitrary
} from './internal'

export * from './types'
export { Arbitrary } from './internal'

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryInteger(min, max))

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryReal(min, max))

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  new ArbitraryInteger(min, max)

export const string = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz'): Arbitrary<string> =>
  chars === '' ? new ArbitraryConstant('') : new ArbitraryString(min, max, chars)

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> =>
  min > max ? NoArbitrary : new ArbitraryArray(arbitrary, min, max)

export const set = <A>(elements: A[], min = 0, max = 10): Arbitrary<A[]> =>
  min > max || min > elements.length || new Set(elements).size !== elements.length ? NoArbitrary :
    new ArbitrarySet(elements, min, Math.min(max, elements.length))

export const oneof = <A>(elements: A[]): Arbitrary<A> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  arbitraries = arbitraries.filter(a => a !== NoArbitrary)
  return arbitraries.length === 0 ? NoArbitrary : (arbitraries.length === 1 ? arbitraries[0] : new ArbitraryComposite(arbitraries))
}

export const boolean = (): Arbitrary<boolean> => new ArbitraryBoolean()

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant)

export const tuple    = (...arbitraries: Arbitrary<any>[]): Arbitrary<any[]> => new ArbitraryTuple(arbitraries)
