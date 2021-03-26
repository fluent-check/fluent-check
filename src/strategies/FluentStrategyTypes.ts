import {Arbitrary, FluentPick} from '../arbitraries'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection?: FluentPick<A>[]
  picked: Set<A>
}

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any> | any>
