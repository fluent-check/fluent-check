import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentConfig} from '../FluentCheck'

export type FluentStrategyArbitrary<A> = {
  dedup: Arbitrary<A>
  cache: FluentPick<A>[]
  collection: FluentPick<A>[]
  pickNum: number
}

export abstract class FluentStrategy {

  /**
   * Default constructor. Receives the configuration used for test
   * case generation purposes.
   */
  constructor(public readonly config: FluentConfig) {}

  abstract hasInput(): boolean

  abstract getInput<A>(): FluentPick<A>

  abstract handleResult()
}
