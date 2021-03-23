export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
}

export type MappedArbitraryExtensions<A,B> = {
  inverseMap?: (b: B) => A[],
  canGenerate?: (pick: FluentPick<B>) => boolean
}
export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = (_: number) => Math.random,
    public readonly seed: number = Math.floor(Math.random() * 0x100000000)) {

    this.initialize()
  }

  initialize() { this.generator = this.builder(this.seed) }
}
