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
  chars === '' ? constant('') : array(integer(0, chars.length - 1).map(n => chars[n]), min, max).map(a => a.join(''))

export const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> =>
  min > max ? NoArbitrary : new ArbitraryArray(arbitrary, min, max)

export const set = <A>(elements: A[], min = 0, max = 10): Arbitrary<A[]> =>
  min > max || min > elements.length ? NoArbitrary : new ArbitrarySet(Array.from(new Set(elements)), min, max)

export const oneof = <A>(elements: A[]): Arbitrary<A> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  arbitraries = arbitraries.filter(a => a !== NoArbitrary)
  return arbitraries.length === 0 ? NoArbitrary : (arbitraries.length === 1 ? arbitraries[0] : new ArbitraryComposite(arbitraries))
}

export const boolean = (): Arbitrary<boolean> => new ArbitraryBoolean()

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant)

export const tuple = <U extends Arbitrary<any>[]>(...arbitraries: U) => new ArbitraryTuple(arbitraries)
