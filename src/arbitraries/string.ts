import * as util from './util.js'
import {constant, array} from './index.js'
import {type Arbitrary, ArbitraryInteger, NoArbitrary} from './internal.js'
import type {HexChar} from './types.js'

const charArb = (min = 0x20, max = 0x7e): Arbitrary<string> =>
  min < 0x20 || max > 0x7e ?
    NoArbitrary :
    new ArbitraryInteger(min, max).map(v => String.fromCodePoint(v))

export const char = (start?: string, end?: string): Arbitrary<string> => {
  if (start === undefined) return charArb()
  const startCode = start.charCodeAt(0)
  const endCode = end?.charCodeAt(0) ?? startCode
  return charArb(startCode, endCode)
}

export const ascii = (): Arbitrary<string> =>
  new ArbitraryInteger(0x00, 0x7f).map(v => String.fromCodePoint(util.printableCharactersMapper(v)))

export const hex = (): Arbitrary<HexChar> =>
  new ArbitraryInteger(0, 15).map(v => String.fromCodePoint(v < 10 ? v + 48 : v + 97 - 10) as HexChar)

export const base64 = (): Arbitrary<string> =>
  new ArbitraryInteger(0, 63).map(v => String.fromCodePoint(util.base64Mapper(v)))

export const unicode = (encoding = 'utf-8'): Arbitrary<string> =>
  encoding === 'utf-16' ?
    new ArbitraryInteger(0x0000, 0x10ffff).map(v => String.fromCodePoint(util.printableCharactersMapper(v))) :
    new ArbitraryInteger(0x0000, 0x10f7ff).map(v => String.fromCodePoint(util.utf8Mapper(v)))

export const base64String = (unscaledMin = 4, unscaledMax = 16): Arbitrary<string> => {
  const options = [undefined, (s: string) => s.slice(1), (s: string) => `${s}==`, (s: string) => `${s}=`]
  return string(unscaledMin + 3 - (unscaledMin + 3) % 4, unscaledMax - unscaledMax % 4, base64())
    .map((s) => {
      const transform = options[s.length % 4] ?? ((value: string) => value)
      return transform(s)
    })
}

export const string = (min = 2, max = 10, charArb = char()): Arbitrary<string> =>
  min === 0 && max === 0 ? constant('') : array(charArb, min, max).map(a => a.join(''))
