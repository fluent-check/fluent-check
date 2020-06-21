export interface Arbitrary<A> {
  size(): ArbitrarySize

  pick(): FluentPick<A> | undefined
  sample(sampleSize?: number): FluentPick<A>[]
  cornerCases(): FluentPick<A>[]
  sampleWithBias(sampleSize?: number): FluentPick<A>[]

  shrink(initial: FluentPick<A>): Arbitrary<A>
  canGenerate(pick: FluentPick<A>): boolean

  map<B>(f: (a: A) => B): Arbitrary<B>
  filter(f: (a: A) => boolean): Arbitrary<A>
  unique(): Arbitrary<A>
}

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
