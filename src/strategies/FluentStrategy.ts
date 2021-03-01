import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentConfig, FluentResult} from '../FluentCheck'

export type FluentStrategyArbitrary<A> = {
  dedup: Arbitrary<A>
  cache: FluentPick<A>[]
  collection: FluentPick<A>[]
  pickNum: number
}

export abstract class FluentStrategy {

  /**
   * Current active arbitrary.
   */
  protected currArbitrary: FluentStrategyArbitrary<any> | any = undefined

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  protected arbitraries: Record<string, FluentStrategyArbitrary<any> | any> = {}

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly config: FluentConfig) {}

  /**
   * Sets the current arbitrary whose name matches the one passed as a parameter.
   */
  setCurrArbitrary<K extends string>(name: K) {
    this.currArbitrary = this.arbitraries[name]
  }

  /**
   * Adds an arbitrary to the arbitraries record.
   */
  abstract addArbitrary<K extends string, A>(name: K, dedup: Arbitrary<A>)

  /**
   * Configures the information relative a specific arbitrary.
   */
  abstract configArbitrary<K extends string>(name: K, partial: FluentResult | undefined, depth: number)

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  abstract hasInput(): boolean

  /**
   * Retrieves a new input from the arbitraries record.
   */
  abstract getInput<A>(): FluentPick<A>

  /**
   * When called this function marks the end of one iteration in the test case generation process. So far, this function
   * is not used but it can be used to perform several operations like keeping a list of generated test cases and save
   * them to a file or even to track coverage.
   */
  abstract handleResult()

}
