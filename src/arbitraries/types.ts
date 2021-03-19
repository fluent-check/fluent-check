export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}

export type MappedArbitraryExtensions<A,B> = {
  inverseMap?: (b: B) => A[],
  canGenerate?: (pick: FluentPick<B>) => boolean
}
