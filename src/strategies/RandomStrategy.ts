import {FluentPicks, Strategy} from './Strategy'
import {Arbitrary} from '../arbitraries'

export class RandomStrategy extends Strategy {

  /**
   * Current active arbitrary
   */
  private currArbitraryName = ''

  /**
   * List of arbitraries used for producing test cases
   */
  private arbitraries: Record<string, any> = {}

  setCurrArbitraryName<K extends string>(name: K) {
    this.currArbitraryName = name
  }

  /**
   * Adds arbitrary to the arbitraries structure that will be further used to generate test cases.
   */
  addArbitrary<K extends string, A>(name: K, a: Arbitrary<A>, maxGenSamples: number, currArbitrary = true) {
    this.currArbitraryName = name
    this.arbitraries[name] = {numGenSamples: 0, maxGenSamples, index: 0, cornerCases: a.cornerCases(), a}
  }

  /**
   * NOTE -> For this particular strategy this function only
   * generates samples to a certain point specified by maxGenSamples.
   * Others factors (e.g. time) can be used to determine when the
   * generation process should be stoped.
   */
  hasInput() {
    return this.arbitraries[this.currArbitraryName] !== undefined &&
    this.arbitraries[this.currArbitraryName].numGenSamples++ <= this.arbitraries[this.currArbitraryName].maxGenSamples
  }

  getInput() {
    const arbitrary = this.arbitraries[this.currArbitraryName]
    if (arbitrary.maxGenSamples > arbitrary.cornerCases.length && arbitrary.index < arbitrary.cornerCases.length)
      return arbitrary.cornerCases[arbitrary.index++]
    else
      return arbitrary.a.pick()
  }

  /**
   * Handles the result of running a test with a certain test case.
   * When called this function marks the end of one iteration in the
   * test case generation process. Therefore the numGenSamples incresases
   * by one each time this function is called.
   *
   * NOTE -> This function can also include some perform additional operations
   * like keeping a list of generated inputs and save them to a file.
   */
  handleResult() {}
}
