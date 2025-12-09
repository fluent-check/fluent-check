import type {Arbitrary, FluentPick} from '../arbitraries/index.js'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  collection?: FluentPick<A>[]
}

/**
 * Bindings map for strategy arbitraries.
 *
 * Represents the subset of the fluent record whose values are backed
 * by arbitraries. At execution time we can safely over-approximate this
 * as the full record type `Rec` used by the scenario.
 */
export type StrategyBindings = Record<string, unknown>

/**
 * Internal map from arbitrary name to its state, parameterized by the
 * bindings record so we preserve the `name -> value type` relationship
 * at the type level.
 */
export type StrategyArbitraries<Rec extends StrategyBindings = StrategyBindings> = {
  [K in keyof Rec & string]: FluentStrategyArbitrary<Rec[K]>
}
