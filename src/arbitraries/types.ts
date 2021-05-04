export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
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

export type graph1D = (testCase: ValueResult<number | number[]>, sizes: ValueResult<number>) => number
export type graph2D = (testCase: ValueResult<number | number[]>, sizes: ValueResult<number>) => [number, number]
export type graphs = {oneD: graph1D[], twoD: graph2D[]}
export type indexCollection = {oneD: number[][], twoD: [number,number][][]}

export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = (_: number) => Math.random,
    public readonly seed: number = Math.floor(Math.random() * 0x100000000)) {

    this.initialize()
  }

  initialize() { this.generator = this.builder(this.seed) }
}
