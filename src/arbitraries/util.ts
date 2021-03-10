import {ArbitrarySize} from './types'

export function mapArbitrarySize(sz: ArbitrarySize, f: (v: number) => ArbitrarySize): ArbitrarySize {
  const result = f(sz.value)
  return {
    value : result.value,
    type : sz.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
    credibleInterval : result.credibleInterval
  }
}

export function stringify(object: any) {
  return (object instanceof Object || object instanceof Array) ? JSON.stringify(object) : object
}

export function hexToDec(s) {
  let i, j, carry
  const digits = [0]
  for (i = 0; i < s.length; i += 1) {
    carry = parseInt(s.charAt(i), 16)
    for (j = 0; j < digits.length; j += 1) {
      digits[j] = digits[j] * 16 + carry
      carry = digits[j] / 10 | 0
      digits[j] %= 10
    }
    while (carry > 0) {
      digits.push(carry % 10)
      carry = carry / 10 | 0
    }
  }
  return digits.reverse().join('')
}

export const NilArbitrarySize: ArbitrarySize = {value: 0, type: 'exact'}
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
