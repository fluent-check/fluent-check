import * as util from './util.js'
import {constant, array} from './index.js'
import {type Arbitrary, ArbitraryInteger, NoArbitrary} from './internal.js'
import type {ExactSizeArbitrary, HexChar} from './types.js'

// Type assertion helper - safe because ArbitraryInteger.size() returns ExactSize
const asExact = <A>(arb: Arbitrary<A>): ExactSizeArbitrary<A> => arb as ExactSizeArbitrary<A>

const charArb = (min = 0x20, max = 0x7e): ExactSizeArbitrary<string> =>
  min < 0x20 || max > 0x7e ?
    NoArbitrary :
    asExact(new ArbitraryInteger(min, max).map(v => String.fromCodePoint(v)))

export const char = (start?: string, end?: string): ExactSizeArbitrary<string> => {
  if (start === undefined) return charArb()
  else {
    const s = start.charCodeAt(0)
    return end !== undefined ? charArb(s, end.charCodeAt(0)) : charArb(s, s)
  }
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

export const base64String = (unscaledMin = 4, unscaledMax = 16): ExactSizeArbitrary<string> =>
  asExact(string(unscaledMin + 3 - (unscaledMin + 3) % 4, unscaledMax - unscaledMax % 4, base64())
    .map((s) => [s, s.slice(1), `${s}==`, `${s}=`][s.length % 4]))

export const string = (min = 2, max = 10, charArb = char()): ExactSizeArbitrary<string> =>
  min === 0 && max === 0 ? constant('') : asExact(array(charArb, min, max).map(a => a.join('')))
