import type {Arbitrary, FluentPick} from '../arbitraries/index.js'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection?: FluentPick<A>[]
}

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any> | any>
