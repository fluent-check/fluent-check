export type FluentPick<V> = {
  value: V
  original?: any
}

export type FluentSample<V> = {
  // The sampled items
  items: FluentPick<V>[]

  // If this sample does not invalidate the property, how likely is it to be valid for the whole population?
  confidence: number
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}
