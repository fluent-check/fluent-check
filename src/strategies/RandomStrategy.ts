import {Strategy} from './Strategy'
import {Arbitrary} from '../arbitraries'

export class RandomStrategy extends Strategy {

  /**
   * Number of samples generated
   */
  private numGenSamples = 0

  private arbitraries: Record<string, any> = {}

  constructor(public readonly maxGenSamples) {
    super()
  }
  /**
   * NOTE -> For this particular strategy this function only
   * generates samples to a certain point specified by maxGenSamples.
   * Others factors (e.g. time) can be used to determine when the
   * generation process should be stoped.
   */
  hasInput() {
    return this.numGenSamples <= this.maxGenSamples
  }

  getInput<K extends string, A>(name: K, a: Arbitrary<A>) {
    if (this.arbitraries[name] === undefined)
      this.arbitraries[name] = {index: 0, cornerCases: a.cornerCases()}

    if (this.maxGenSamples > this.arbitraries[name].cornerCases.length &&
       this.arbitraries[name].index < this.arbitraries[name].cornerCases.length)
      return this.arbitraries[name].cornerCases[this.arbitraries[name].index++]
    else
      return a.pick()
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
  handleResult(res: Boolean) {
    this.numGenSamples++
  }

  reset() {
    this.arbitraries = {}
    this.numGenSamples = 0
  }
}
