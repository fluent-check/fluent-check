export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
}

export type TestCases = {
  wrapped: WrapFluentPick<any>[],
  unwrapped: ValueResult<any>[],
  time: number[],
  result: boolean[]
}

export type PrintInfo = {
  unwrapped: ValueResult<any>[],
  time: number[],
  result: boolean[]
}

export type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }
export type ValueResult<V> = Record<string, V>

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export type ArbitraryCoverage = Record<string, number | [number, number]>
export type ScenarioCoverage = number | [number, number]

export type Graph1D = (testCase: ValueResult<number | number[]>,
  sizes: ValueResult<number>, execTime: number, result: boolean) => number
export type Graph2D = (testCase: ValueResult<number | number[]>,
  sizes: ValueResult<number>, execTime: number, result: boolean) => [number, number]

type GraphPath1D = {path?: string, graph: Graph1D}
type GraphPath2D = {path?: string, graph: Graph2D}
export type Graphs = {oneD: GraphPath1D[], twoD: GraphPath2D[]}

export type IndexPath1D = {path?: string, indexes: number[]}
export type IndexPath2D = {path?: string, indexes: [number, number][]}
export type IndexCollection = {oneD: IndexPath1D[], twoD: IndexPath2D[]}

export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = (_: number) => Math.random,
    public readonly seed: number = Math.floor(Math.random() * 0x100000000)) {

    this.initialize()
  }

  initialize() { this.generator = this.builder(this.seed) }
}
