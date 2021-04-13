import * as utils from './mixins/utils'

import {FluentResult} from '../FluentCheck'
import {FluentStrategyConfig, StrategyArbitraries} from './FluentStrategyTypes'
import {Arbitrary, FluentPick, ValueResult, FluentRandomGenerator, WrapFluentPick} from '../arbitraries'

export interface FluentStrategyInterface {
  hasInput: () => boolean
  getInput: () => WrapFluentPick<any>
  handleResult: (inputData: any[]) => void
}

export class FluentStrategy implements FluentStrategyInterface {

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  protected arbitraries: StrategyArbitraries = {}

  /**
   * Contains all the test methods concerning a test case.
   */
  protected testMethods: {(...args: any[]): any} [] = []

  /**
   * Contains all the test cases used for a given test.
   */
  protected testCases: ValueResult<any>[] = []

  /**
   * Contains all the test cases that are expected to used for a given test
   */
  protected testCaseCollection: WrapFluentPick<any>[] = []

  /**
   * Current test case being used for testing purposes.
   */
  protected currTestCase: WrapFluentPick<any> = {}

  /*
   * Information concerning the random value generation.
   */
  protected randomGenerator = new FluentRandomGenerator()

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(protected readonly configuration: FluentStrategyConfig) {}

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, collection: []}
    this.setArbitraryCache(arbitraryName)
  }

  /**
   * Adds a test method to the testMethods array.
   */
  addTestMethod(f: (...args: any[]) => any) {
    this.testMethods.push(f)
  }

  /**
   * Adds a new test case to the testCases array.
   */
  addTestCase<A>(testCase: ValueResult<A>) {
    this.testCases.push(testCase)
  }

  /**
   * Executes all the need operations concerning the strategy's setup.
   */
  setup() {
    this.randomGenerator.initialize()
    this.coverageSetup()
  }

  /**
   * Configures the information relative to the arbitraries.
   */
  configArbitraries<A>() {
    Object.keys(this.arbitraries).forEach(name => {
      this.arbitraries[name].collection = this.arbitraries[name].cache !== undefined ?
        this.arbitraries[name].cache as FluentPick<A>[]:
        this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
          this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
    })

    this.generateTestCaseCollection()
  }

  /**
   * Updates each arbitrary collection. This function is called when an arbitrary with a given name has been shrinked.
   * When that happens all the arbitraries prior to such arbitrary are set to have a collection equal to the value
   * present in the test case, which is passed as an argument. The remaining arbitraries are set to have a collection
   * equal to its cache. If the cache is not active then a new collection is generated.
   */
  updateArbitraryCollections<A>(arbitraryName = '', testCase = {}) {
    this.testCaseCollection = []
    let arbitraryFound = false

    Object.keys(this.arbitraries).forEach(name => {
      if (name === arbitraryName) arbitraryFound = true
      else {
        if (!arbitraryFound) this.arbitraries[name].collection = [testCase[name]]
        else
          this.arbitraries[name].collection = this.arbitraries[name].cache !== undefined ?
            this.arbitraries[name].cache as FluentPick<A>[]:
            this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
              this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
      }
    })
  }

  /**
   * Generates the test case collection.
   */
  generateTestCaseCollection() {
    utils.computeCombinations(Object.values(this.arbitraries).map(x => x.collection)).forEach(testCase => {
      this.testCaseCollection.push(testCase.reduce((acc, value, index) => {
        acc[Object.keys(this.arbitraries)[index]] = value
        return acc
      }, {}))
    })
  }

  /**
   * Executes all the need operations concerning the strategy's tear down.
   */
  tearDown() {
    this.coverageTearDown()
  }

  /**
   * Returns the associated strategy configuration.
   */
  getConfiguration(): FluentStrategyConfig {
    return this.configuration
  }

  /**
   * Returns the current test case
   */
  getCurrentTestCase() {
    return this.currTestCase
  }

  /**
   * Returns the current test case collection.
   */
  getTestCaseCollection() {
    return this.testCaseCollection
  }

  /**
   * Returns the associated random generator.
   */
  getRandomGenerator(): FluentRandomGenerator {
    return this.randomGenerator
  }

  /**
   * Sets the current random generator.
   */
  setRandomGenerator(prng: FluentRandomGenerator) {
    this.randomGenerator = prng
  }

  //////////////////////
  // OVERRIDE METHODS //
  //////////////////////

  /**
   * Shrinks an arbitrary with a given name for a considered test case. It returns true if the shrinking is possible.
   * Otherwise it returns false.
   */
  shrink<K extends string>(_name: K, _partial: FluentResult | undefined): boolean { return false }

  /**
   * Determines whether uniqueness should be taken into account while generating samples.
   */
  protected isDedupable() {
    return false
  }

  /**
   * Generates a once a collection of inputs for a given arbitrary
   */
  protected buildArbitraryCollection<A>(
    arbitrary: Arbitrary<A>,
    currSample: FluentPick<A>[],
    sampleSize = this.configuration.sampleSize
  ): FluentPick<A>[] {
    return this.isDedupable() ?
      arbitrary.sampleUnique(sampleSize, currSample, this.randomGenerator.generator) :
      arbitrary.sample(sampleSize, currSample, this.randomGenerator.generator)
  }

  //////////////////
  // HOOK METHODS //
  //////////////////

  /**
   * Hook that acts as point of extension of the addArbitrary function and that enables the strategy to be cached.
   */
  protected setArbitraryCache<K extends string>(_arbitraryName: K) {}

  /**
   * Hook that acts as point of extension of the buildArbitraryCollection function and that enables the strategy to use
   * extracted constants from code in the test cases.
   */
  protected getArbitraryExtractedConstants<A>(_arbitrary: Arbitrary<A>): FluentPick<A>[] { return [] }

  /**
   * Hook that acts as point of extension of the setup function and that enables the strategy to track and use coverage
   * to drive the testing process by allowing its setup.
   */
  protected coverageSetup() {}

  /**
   * Hook that acts as point of extension of the addAssertion function and that enables the strategy to compute coverage
   * for a given test case.
   */
  protected computeCoverage(_inputData: {}) {}

  /**
   * Hook that acts as point of extension of the tearDown function and that enables the strategy to tear down all the
   * coverage based operations.
   */
  protected coverageTearDown() {}

  ///////////////////////
  // INTERFACE METHODS //
  ///////////////////////

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  hasInput(): boolean {
    throw new Error('Method <hasInput> not implemented.')
  }

  /**
   * Updates the current input being used for testing purposes and returns it.
   */
  getInput(): WrapFluentPick<any> {
    throw new Error('Method <getInput> not implemented.')
  }

  /**
   * When called this function marks the end of one iteration in the test case generation process. This function can be
   * used to perform several operations like keeping a list of generated test cases and save them to a file or even to
   * track coverage.
   */
  handleResult(_inputData: any[]) {
    throw new Error('Method <handleResult> not implemented.')
  }

}
