export type FluentPick<V> = {
  value: V
  original?: any
}

// TODO(rui): add "unbounded" size (e.g. reals) and make this type stricter (e.g. "exact" sizes
// shouldn't have credible intervals, "unbounded" sizes don't need a "value")
export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}
