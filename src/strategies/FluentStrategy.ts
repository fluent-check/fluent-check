import * as utils from './mixins/utils'
import {performance} from 'perf_hooks'

import {FluentResult} from '../FluentCheck'
import {FluentCoverage} from './FluentCoverage'
import {FluentStrategyConfig, StrategyArbitraries} from './FluentStrategyTypes'
import {Arbitrary, FluentPick, ValueResult, FluentRandomGenerator, WrapFluentPick} from '../arbitraries'

export interface FluentStrategyInterface {
  configArbitraries: () => void
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
   * Maps the arbitraries' keys to the respective test case index
   */
  protected arbitrariesKeysIndex: string[] = []

  /**
   * Contains all the test methods concerning a test case.
   */
  protected testMethods: {(...args: any[]): any} [] = []

  /**
   * Contains all the test cases used for a given test. Each test case considers all the input data
   * used by the respective test assertions.
   */
  protected testCases: Set<ValueResult<any>> = new Set()

  /**
   * Contains all the test cases that are expected to used for a given test
   */
  protected testCaseCollection: WrapFluentPick<any>[] = []

  /**
   * Indicates which test case is being used from the test case collection structure.
   */
  protected testCaseCollectionPick = 0

  /**
   * Current test case being used for testing purposes.
   */
  protected currTestCase: WrapFluentPick<any> = {}

  /**
   * The initial high resolution millisecond timestamp.
   */
  protected initTime: number | undefined = undefined

  /**
   * The current high resolution millisecond timestamp.
   */
  protected currTime: number | undefined = undefined

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
    this.arbitraries[arbitraryName] = {arbitrary: a, collection: [], seedCollection: []}
    this.setArbitraryCache(arbitraryName)
  }

  /**
   * Adds a test method to the testMethods array.
   */
  addTestMethod(f: (...args: any[]) => any) {
    this.testMethods.push(f)
  }

  /**
   * Adds a new test case to the testCases set.
   */
  addTestCase<A>(testCase: ValueResult<A>) {
    this.testCases.add(testCase)
  }

  /**
   * Executes all the need operations concerning the strategy's setup.
   */
  setup() {
    this.randomGenerator.initialize()
    this.coverageSetup()
  }

  /**
   * Initializes the initial high resolution millisecond timestamp.
   */
  initializeTimer() {
    this.initTime = performance.now()
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

    for (const name in this.arbitraries) {
      if (name === arbitraryName) arbitraryFound = true
      else {
        if (!arbitraryFound) this.arbitraries[name].collection = [testCase[name]]
        else
          this.arbitraries[name].collection = this.arbitraries[name].cache !== undefined ?
            this.arbitraries[name].cache as FluentPick<A>[]:
            this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
              this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
      }
    }
  }

  /**
   * Generates the test case collection.
   */
  generateTestCaseCollection() {
    this.testCaseCollectionPick = 0

    utils.computeCombinations(Object.values(this.arbitraries).map(x => x.collection),
      this.configuration.pairwise ? 2 : Number.MAX_VALUE
    ).forEach(testCase => {
      this.testCaseCollection.push(testCase.reduce((acc, value, index) => {
        acc[this.arbitrariesKeysIndex[index]] = value
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
  getCurrentTestCase(): WrapFluentPick<any> {
    return this.currTestCase
  }

  /**
   * Returns a set of all used test cases.
   */
  getTestCases(): Set<ValueResult<any>> {
    return this.testCases
  }

  /**
   * Returns the current test case collection.
   */
  getTestCaseCollection(): WrapFluentPick<any>[] {
    return this.testCaseCollection
  }

  /**
   * Returns the current test case collection pick.
   */
  getTestCaseCollectionPick(): number {
    return this.testCaseCollectionPick
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
   * Returns the code coverage until the moment this function is called. Returns an empty object if the base strategy
   * is random-based; otherwise, it returns the measured coverage.
   */
  getCoverage(): number { return 0 }

  /**
   * Returns the instance responsible for tracking coverage.
   */
  protected getCoverageBuilder(): FluentCoverage | undefined { return undefined }

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
   * Hook that acts as point of extension of the tearDown function and that enables the strategy to tear down all the
   * coverage based operations.
   */
  protected coverageTearDown() {}

  /**
   * Hook that acts as point of extension of the configArbitraries function and that enables the strategy to fine-tune
   * the sampleSize variable according to the number of arbitraries used in the testing process.
   */
  protected tweakSampleSize() {}

  ///////////////////////
  // INTERFACE METHODS //
  ///////////////////////

  /**
   * Configures the information relative to the arbitraries according to the base strategy selected.
   */
  configArbitraries(): void {
    throw new Error('Method <configArbitraries> not implemented.')
  }

  /**
   * Determines whether there are more inputs to be used in testing process. It returns false
   * if the testing process should be stopped, and true otherwise.
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
   * This function can be used to perform several operations associated with a specific test case, which result
   * is known at this point.
   */
  handleResult(_inputData: any[]) {
    throw new Error('Method <handleResult> not implemented.')
  }

}
