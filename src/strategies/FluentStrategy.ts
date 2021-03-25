import {Arbitrary, FluentPick, FluentRandomGenerator} from '../arbitraries'
import {FluentResult} from '../FluentCheck'
import {FluentStrategyConfig, StrategyArbitraries} from './FluentStrategyTypes'

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
   * Contains all the test methods concerning a test case
   */
  public testMethods: {(...args: any[]): any} [] = []

  /**
   * Information concerning the random value generation
   */
  public randomGenerator = new FluentRandomGenerator()

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly configuration: FluentStrategyConfig) {}

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, pickNum: 0, collection: []}
  }

  /**
   * Adds a test method to the testMethods array.
   */
  addTestMethod(f: (...args: any[]) => any) {
    this.testMethods.push(f)
  }

  /**
   * Executes all the need operations concerning the strategy's setup.
   */
  setup() {
    this.randomGenerator.initialize()
    this.coverageSetup()
  }

  /**
   * Executes all the need operations concerning the strategy's tear down.
   */
  tearDown() {
    this.coverageTearDown()
  }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends string, A>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
    this.arbitraries[arbitraryName].pickNum = 0
    this.arbitraries[arbitraryName].collection = []

    this.setArbitraryCache(arbitraryName)

    if (depth === 0)
      this.arbitraries[arbitraryName].collection = this.arbitraries[arbitraryName].cache !== undefined ?
        this.arbitraries[arbitraryName].cache as FluentPick<A>[]:
        this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    else if (partial !== undefined)
      this.shrink(arbitraryName, partial)
  }

  /**
   * Determines whether uniqueness should be taken into account while generating samples.
   */
  isDedupable() {
    return false
  }

  /**
   * Hook that acts as point of extension of the addArbitrary function and that enables the strategy to be cached.
   */
  setArbitraryCache<K extends string>(_arbitraryName: K) {}

  /**
   * Generates a once a collection of inputs for a given arbitrary
   */
  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
    const constantsSample = this.getArbitraryExtractedConstants(arbitrary)
    return this.isDedupable() ?
      arbitrary.sampleUnique(sampleSize, constantsSample, this.randomGenerator.generator) :
      arbitrary.sample(sampleSize, constantsSample, this.randomGenerator.generator)
  }

  /**
   * Hook that acts as point of extension of the configArbitrary function and that enables an arbitrary to be shrinked.
   */
  shrink<K extends string>(_name: K, _partial: FluentResult | undefined) {}

  /**
   * Hook that acts as point of extension of the buildArbitraryCollection function and that enables the strategy to use
   * extracted constants from code in the test cases.
   */
  getArbitraryExtractedConstants<A>(_arbitrary: Arbitrary<A>): FluentPick<A>[] {
    return []
  }

  /**
   * Hoot that acts as point of extension of the setup function and that enables the strategy to track and use coverage
   * to drive the testing process by allowing its setup.
   */
  coverageSetup() {}

  /**
   * Hoot that acts as point of extension of the tearDown function and that enables the strategy to tear down all the
   * coverage based operations.
   */
  coverageTearDown() {}

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  hasInput<K extends string>(_arbitraryName: K): boolean {
    throw new Error('Method <hasInput> not implemented.')
  }

  /**
   * Retrieves a new input from the arbitraries record.
   */
  getInput<K extends string, A>(_arbitraryName: K): FluentPick<A> {
    throw new Error('Method <getInput> not implemented.')
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
