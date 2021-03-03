import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentStrategy} from './FluentStrategy'

export type FluentStrategyArbitrary<A> = {
  dedup: Arbitrary<A>
  cache: FluentPick<A>[]
  collection: FluentPick<A>[]
  pickNum: number
}

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any> | any>

type MixinConstructor<T = {}> = new (...args: any[]) => T

export type MixinStrategy = MixinConstructor<FluentStrategy>
