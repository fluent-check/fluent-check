import {Arbitrary, FluentPick} from '../arbitraries'

export type FluentPicks = Record<string, FluentPick<any> | any>

export abstract class Strategy {
  /**
   * Determines whether there are still inputs to be generated or not
   */
  abstract hasInput(): boolean

  /**
   * Generates a new input
   */
  abstract getInput<A>(): FluentPick<A>

  /**
   * Handles the result of running a particular test case
   */
  abstract handleResult()
}
