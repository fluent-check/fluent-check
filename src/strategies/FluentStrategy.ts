import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentConfig, FluentResult} from '../FluentCheck'
import {StrategyArbitraries} from './types'

export interface FluentStrategyInterface {
  hasInput: <K extends string>(arbitraryName: K) => boolean
  getInput: <K extends string, A>(arbitraryName: K) => FluentPick<A>
  handleResult: () => void
}

export class FluentStrategy implements FluentStrategyInterface {

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  public arbitraries: StrategyArbitraries = {}

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly config: FluentConfig) {}

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, pickNum: 0}
    this.setArbitraryCache(arbitraryName)
  }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends string>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
    this.arbitraries[arbitraryName].pickNum = 0
    this.arbitraries[arbitraryName].collection = []

    if (depth === 0)
      this.arbitraries[arbitraryName].collection = this.arbitraries[arbitraryName].cache !== undefined ?
        this.arbitraries[arbitraryName].cache :
        this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    else if (partial !== undefined)
      this.shrink(arbitraryName, partial, depth)
  }

  /**
   * Hook that acts as point of extension of the addArbitrary function and that enables the strategy to be cached.
   */
  setArbitraryCache<K extends string, A>(_arbitraryName: K) {}

  /**
   * Generates a once a collection of inputs for a given arbitrary
   */
  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.config.sampleSize): FluentPick<A>[] {
    return arbitrary.sample(sampleSize)
  }

  /**
   * Hook that acts as point of extension of the configArbitrary function and that enables an arbitrary to be shrinked.
   */
  shrink<K extends string>(_name: K, _partial: FluentResult | undefined, _depth: number) {}

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  hasInput<K extends string>(arbitraryName: K): boolean {
    throw new Error('Method <hasInput> not implemented.')
  }

  /**
   * Retrieves a new input from the arbitraries record.
   */
  getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
    throw new Error('Method <getInput > not implemented.')
  }

  /**
   * When called this function marks the end of one iteration in the test case generation process. So far, this function
   * is not used but it can be used to perform several operations like keeping a list of generated test cases and save
   * them to a file or even to track coverage.
   */
  handleResult() {
    throw new Error('Method <handleResult> not implemented.')
  }

}
