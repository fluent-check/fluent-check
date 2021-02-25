import {Arbitrary, FluentPick} from '../arbitraries'

export abstract class Strategy {
  /**
   * Determines whether there are still inputs to be generated or not
   */
  abstract hasInput(): Boolean

  /**
   * Generates a new input
   */
  abstract getInput<A>(a: Arbitrary<A>): FluentPick<any> | undefined

  /**
   * Handles the result of running a particular test case
   */
  abstract handleResult(res: Boolean): void
}
