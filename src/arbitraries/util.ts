import { ArbitrarySize } from './types'

export const NilArbitrarySize: ArbitrarySize = { value: 0, type: 'exact' }
export const significance = 0.90
export const lowerCredibleInterval = (1 - significance) / 2
export const upperCredibleInterval = 1 - lowerCredibleInterval
