export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}

export type PrngInfo = {
  unseededGen?: (seed: number) => () => number,
  generator: () => number,
  seed?: number
}
