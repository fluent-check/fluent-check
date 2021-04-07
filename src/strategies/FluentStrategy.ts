import {FluentResult} from '../FluentCheck'
import {FluentStrategyConfig, StrategyArbitraries} from './FluentStrategyTypes'
import {Arbitrary, FluentPick, ValueResult, FluentRandomGenerator, WrapFluentPick} from '../arbitraries'

export interface FluentStrategyInterface {
  addArbitrary: <K extends string, A>(arbitraryName: K, a: Arbitrary<A>) => void
  configArbitrary: <K extends string>(_arbitraryName: K, _partial: FluentResult | undefined, _depth: number) => void

  hasInput: <K extends string>(arbitraryName: K) => boolean
  getInput: (name: string) => void
  handleResult: <A>(testCase: ValueResult<A>, inputData: {}) => void
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
   * Adds a new input to the current test case structure.
   */
  addInputToCurrentTestCase(name: string, value: FluentPick<any>) {
    this.currTestCase[name] = value
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
   * Hook that acts as point of extension of the configArbitrary function and that enables an arbitrary to be shrinked.
   */
  protected shrink<K extends string>(_name: K, _partial: FluentResult | undefined) {}

  /**
   * Hook that acts as point of extension of the buildArbitraryCollection function and that enables the strategy to use
   * extracted constants from code in the test cases.
   */
  protected getArbitraryExtractedConstants<A>(_arbitrary: Arbitrary<A>): FluentPick<A>[] {
    return []
  }

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
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends string, A>(_arbitraryName: K, _a: Arbitrary<A>) {
    throw new Error('Method <addArbitrary> not implemented.')
  }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends string>(_arbitraryName: K, _partial: FluentResult | undefined, _depth: number) {
    throw new Error('Method <configArbitrary> not implemented.')
  }

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
  getInput(_name: string) {
    throw new Error('Method <getInput> not implemented.')
  }

  /**
   * When called this function marks the end of one iteration in the test case generation process. This function can be
   * used to perform several operations like keeping a list of generated test cases and save them to a file or even to
   * track coverage.
   */
  handleResult<A>(_testCase: ValueResult<A>, _inputData: {}) {
    throw new Error('Method <handleResult> not implemented.')
  }
}
