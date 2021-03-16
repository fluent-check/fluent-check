import {ArbitrarySize} from './types'

export function mapArbitrarySize(sz: ArbitrarySize, f: (v: number) => ArbitrarySize): ArbitrarySize {
  const result = f(sz.value)
  return {
    value : result.value,
    type : sz.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
    credibleInterval : result.credibleInterval
  }
}

export const printableCharactersMapper = (v: number): number => {
  if (v < 95) return v + 0x20   // 0x20-0x7e
  if (v <= 0x7e) return v - 95
  return v
}

export function base64Mapper(v: number) {
  if (v < 26) return v + 65        // A-Z
  if (v < 52) return v + 97 - 26   // a-z
  if (v < 62) return v + 48 - 52   // 0-9
  return v === 62 ? 43 : 47        // +/
}

export function stringify(object: any) {
  return (object instanceof Object || object instanceof Array) ? JSON.stringify(object) : object
}

export const NilArbitrarySize: ArbitrarySize = {value: 0, type: 'exact'}
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
