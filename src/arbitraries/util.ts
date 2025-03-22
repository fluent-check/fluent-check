import {ArbitrarySize} from './types.js'

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
  if (v < 0x1f) return v + 0x20             // ASCII control characters
  else if (v >= 0xd800 && v < 0xe000) return 0x20  // Reserved UTF-16 surrogates
  else return v
}

/**
 * Maps a given number to base64.
 *
 * https://base64.guru/learn/base64-characters
 */
export const base64Mapper = (v: number): number => {
  return v < 26 ? v + 65 :
    v < 52 ? v + 71 :
      v < 62 ? v - 4 :
        v === 62 ? 43 :
          47
}

/**
 * Maps a given number to UTF-8 encoding. Values between 0xD800 and 0xDFFF are specifically reserved for
 * use with UTF-16 [https://tools.ietf.org/html/rfc2781].
 *
 * https://tools.ietf.org/html/rfc3629
 */
export const utf8Mapper = (v: number): number => {
  // Adjusting reserved UTF-16 surrogates
  if (v >= 0xd800 && v < 0xe000) return 0x20
  else return v
}
