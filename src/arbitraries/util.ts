import { ArbitrarySize } from './types'

export function mapArbitrarySize(sz: ArbitrarySize, f: (v: number) => ArbitrarySize): ArbitrarySize {
  const result = f(sz.value)
  // TODO(rui): combine credible intervals when both arbitraries are estimated?
  return sz.type === 'estimated' || result.type === 'estimated' ?
    {
      type: 'estimated',
      value: result.value,
      credibleInterval: sz.credibleInterval || result.credibleInterval
    } :
    result
}

export const NilArbitrarySize: ArbitrarySize = { value: 0, type: 'exact' }
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
