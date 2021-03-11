import {Arbitrary, FluentPick} from '../arbitraries'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection?: FluentPick<A>[]
}

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any> | any>

export type StrategyConstants = Record<string, Array<any>>

export type FluentStrategyConfig = {
  sampleSize: number,
  shrinkSize?: number,
  globSource?: string
}
