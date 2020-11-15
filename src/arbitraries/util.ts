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

export const NilArbitrarySize: ArbitrarySize = {value: 0, type: 'exact'}
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
