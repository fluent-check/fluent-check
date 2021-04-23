
import * as util from './util'
import {constant, array} from './index'
import {Arbitrary, ArbitraryInteger, NoArbitrary,} from './internal'

const charArb = (min = 0x20, max = 0x7e): Arbitrary<string> => min < 0x20 || max > 0x7e ?
  NoArbitrary : new ArbitraryInteger(min, max).map((v) => String.fromCodePoint(v))

const base64String = (unscaledMin = 4, unscaledMax = 16): Arbitrary<string> =>
  array(base64(), unscaledMin + 3 - (unscaledMin + 3) % 4, unscaledMax - unscaledMax % 4)
    .map(a => a.join(''), {inverseMap: util.getInverseMapper('')})
    .map((s) => [s, s.slice(1), `${s}==`, `${s}=`][s.length % 4], {
      inverseMap: (v) => [v.original.map((x) => String.fromCodePoint(util.base64Mapper(x))).join('')]
    })

export const char = (start?: string, end?: string): Arbitrary<string> => {
  if (start === undefined) return charArb()
  else {
    const s = start.charCodeAt(0)
    return end !== undefined ? charArb(s, end.charCodeAt(0)) : charArb(s, s)
  }
}

export const ascii = (): Arbitrary<string> =>
  new ArbitraryInteger(0x00, 0x7f).map((v) => String.fromCodePoint(util.printableCharactersMapper(v)))

export const hex = (): Arbitrary<string> =>
  new ArbitraryInteger(0, 15).map((v) => String.fromCodePoint(v < 10 ? v + 48 : v + 97 - 10))

export const base64 = (): Arbitrary<string> =>
  new ArbitraryInteger(0, 63).map((v) => String.fromCodePoint(util.base64Mapper(v)))

export const unicode = (encoding = 'utf-8'): Arbitrary<string> => encoding === 'utf-16' ?
  new ArbitraryInteger(0x0000, 0x10ffff).map((v) => String.fromCodePoint(util.printableCharactersMapper(v))) :
  new ArbitraryInteger(0x0000, 0x10f7ff).map((v) => String.fromCodePoint(util.utf8Mapper(v)))

export const string = (min = 2, max = 10, charArb = char()): Arbitrary<string> => {
  if (min === 0 && max === 0) return constant('')
  else if (charArb.toString().includes(util.BASE64)) return base64String(min, max)
  return array(charArb, min, max).map(a => a.join(''), {
    inverseMap: util.getInverseMapper(charArb.toString())
  })
}
