import * as util from './util.js'
import {constant, array} from './index.js'
import {type Arbitrary, ArbitraryInteger, NoArbitrary} from './internal.js'
import type {HexChar, ExactSizeArbitrary} from './types.js'

// Helper to assert that an Arbitrary is ExactSizeArbitrary at factory boundaries
const asExact = <A>(arb: Arbitrary<A>): ExactSizeArbitrary<A> => arb as ExactSizeArbitrary<A>

const charArb = (min = 0x20, max = 0x7e): ExactSizeArbitrary<string> =>
  min < 0x20 || max > 0x7e ?
    NoArbitrary :
    asExact(new ArbitraryInteger(min, max).map(v => String.fromCodePoint(v)))

export const char = (start?: string, end?: string): ExactSizeArbitrary<string> => {
  if (start === undefined) return charArb()
  const startCode = start.charCodeAt(0)
  const endCode = end?.charCodeAt(0) ?? startCode
  return charArb(startCode, endCode)
}

export const ascii = (): ExactSizeArbitrary<string> =>
  asExact(new ArbitraryInteger(0x00, 0x7f).map(v => String.fromCodePoint(util.printableCharactersMapper(v))))

export const hex = (): ExactSizeArbitrary<HexChar> =>
  asExact(new ArbitraryInteger(0, 15).map(v => String.fromCodePoint(v < 10 ? v + 48 : v + 97 - 10) as HexChar))

export const base64 = (): ExactSizeArbitrary<string> =>
  asExact(new ArbitraryInteger(0, 63).map(v => String.fromCodePoint(util.base64Mapper(v))))

export const unicode = (encoding = 'utf-8'): ExactSizeArbitrary<string> =>
  encoding === 'utf-16' ?
    asExact(new ArbitraryInteger(0x0000, 0x10ffff).map(v => String.fromCodePoint(util.printableCharactersMapper(v)))) :
    asExact(new ArbitraryInteger(0x0000, 0x10f7ff).map(v => String.fromCodePoint(util.utf8Mapper(v))))

export const base64String = (unscaledMin = 4, unscaledMax = 16): ExactSizeArbitrary<string> => {
  const options = [undefined, (s: string) => s.slice(1), (s: string) => `${s}==`, (s: string) => `${s}=`]
  return asExact(string(unscaledMin + 3 - (unscaledMin + 3) % 4, unscaledMax - unscaledMax % 4, base64())
    .map((s) => {
      const transform = options[s.length % 4] ?? ((value: string) => value)
      return transform(s)
    }))
}

export function string(min?: number, max?: number): ExactSizeArbitrary<string>
export function string(min: number, max: number, charArb: ExactSizeArbitrary<string>): ExactSizeArbitrary<string>
export function string(min: number, max: number, charArb: Arbitrary<string>): Arbitrary<string>
export function string(min = 2, max = 10, charArb: Arbitrary<string> = char()): Arbitrary<string> {
  if (min === 0 && max === 0) return constant('')
  return array(charArb, min, max).map(a => a.join(''))
}
