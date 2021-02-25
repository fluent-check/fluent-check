import {Strategy} from './Strategy'
import {Arbitrary} from '../arbitraries'

export class RandomStrategy extends Strategy {

  /**
   * Number of samples generated
   */
  private numGenSamples = 0

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

  getInput<A>(a: Arbitrary<A>) {
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
}
