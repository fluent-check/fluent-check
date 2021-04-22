import {ArbitrarySize} from './types'

export const NilArbitrarySize: ArbitrarySize = {value: 0, type: 'exact', credibleInterval: [0, 0]}
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval

export function mapArbitrarySize(sz: ArbitrarySize, f: (v: number) => ArbitrarySize): ArbitrarySize {
  const result = f(sz.value)
  return {
    value : result.value,
    type : sz.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
    credibleInterval : result.credibleInterval
  }
}

export function stringify(object: any) {
  return object instanceof Object || object instanceof Array ? JSON.stringify(object) : object
}

/**
 * Maps a given number to a printable character.
 *
 * https://www.ascii-code.com/
 */
export const printableCharactersMapper = (v: number): number => {
  if (v < 95) return v + 0x20   // 0x20-0x7e
  if (v <= 0x7e) return v - 95
  return v
}

/**
 * Maps a given number to base64.
 *
 * https://base64.guru/learn/base64-characters
 */
export function base64Mapper(v: number) {
  if (v < 26) return v + 65        // A-Z
  if (v < 52) return v + 97 - 26   // a-z
  if (v < 62) return v + 48 - 52   // 0-9
  return v === 62 ? 43 : 47        // +/
}

/**
 * Maps a given number to UTF-8 encoding. Values between 0xD800 and 0xDFFF are specifically reserved for
 * use with UTF-16 [https://tools.ietf.org/html/rfc2781].
 *
 * https://tools.ietf.org/html/rfc3629
 */
export function utf8Mapper(v: number) {
  if (v < 0xd800) return printableCharactersMapper(v)
  return v + (0xdfff + 1 - 0xd800)
}

/**
 * Returns a random number between min (inclusive) and max (inclusive)
 */
export function getRandomNumber(min, max, generator: () => number) {
  return generator() * (max - min + 1) + min
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 */
export function getRandomInt(min, max, generator: () => number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(generator() * (max - min + 1)) + min
}

/**
 * Returns a random boolean value with 50% probability of getting true  and 50% of
 * getting false.
 */
export function getRandomBoolean(generator: () => number) {
  return generator() < 0.5
}
