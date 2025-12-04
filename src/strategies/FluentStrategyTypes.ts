import type {Arbitrary, FluentPick} from '../arbitraries/index.js'

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection?: FluentPick<A>[]
}

/**
 * Internal map from arbitrary name to its state, parameterized by the
 * record type so we preserve the `name -> value type`
 * relationship at the type level.
 *
 * The default `StrategyArbitraries` alias (`StrategyArbitraries<>`)
 * is equivalent to an existential
 * `Record<string, FluentStrategyArbitrary<unknown>>`.
 */
export type StrategyArbitraries<Rec extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof Rec & string]: FluentStrategyArbitrary<Rec[K]>
}
