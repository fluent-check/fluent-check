export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}

export type MappedArbitraryConfig<A,B> = {
  inverseFunction?: (b: B) => A | A[],
  customCanGenerate?: (pick: FluentPick<B>) => boolean
}
