import {type Arbitrary, type FluentPick, FluentRandomGenerator} from '../arbitraries/index.js'
import type {FluentResult} from '../FluentCheck.js'
import {
  type FluentStrategyArbitrary,
  type StrategyArbitraries
} from './FluentStrategyTypes.js'

export type FluentConfig = { sampleSize?: number, shrinkSize?: number }

export interface FluentStrategyInterface<Rec extends Record<string, unknown> = Record<string, unknown>> {
  hasInput: <K extends keyof Rec & string>(arbitraryName: K) => boolean
  getInput: <K extends keyof Rec & string>(arbitraryName: K) => FluentPick<Rec[K]>
  handleResult: () => void
}

export class FluentStrategy<Rec extends Record<string, unknown> = Record<string, unknown>>
  implements FluentStrategyInterface<Rec> {

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  public arbitraries: StrategyArbitraries<Rec> = {} as StrategyArbitraries<Rec>

  /**
   * Information concerning the random value generation
   */
  public randomGenerator = new FluentRandomGenerator()

  /**
   * Helper for accessing the internal arbitrary state by name.
   *
   * The fluent API guarantees by construction that any arbitrary referenced
   * through quantifiers has been registered via `addArbitrary`, so this
   * method intentionally does not perform runtime validation.
   *
   * Public visibility is required so that mixin-generated subclasses can
   * safely use it without triggering protected/anonymous class constraints
   * in the TypeScript type system.
   */
  getArbitraryState<K extends keyof Rec & string>(arbitraryName: K): FluentStrategyArbitrary<Rec[K]> {
    return this.arbitraries[arbitraryName]!
  }

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly configuration: FluentConfig) {
    // Ensure sampleSize and shrinkSize are always defined
    this.configuration.sampleSize = this.configuration.sampleSize ?? 1000
    this.configuration.shrinkSize = this.configuration.shrinkSize ?? 500
  }

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends keyof Rec & string>(arbitraryName: K, a: Arbitrary<Rec[K]>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, pickNum: 0, collection: []}
    this.setArbitraryCache(arbitraryName)
  }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends keyof Rec & string>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
    const state = this.getArbitraryState(arbitraryName)
    state.pickNum = 0
    state.collection = []

    if (depth === 0) {
      state.collection = state.cache ?? this.buildArbitraryCollection(state.arbitrary)
    } else if (partial !== undefined) {
      this.shrink(arbitraryName, partial)
    }
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
  setArbitraryCache<K extends keyof Rec & string>(_arbitraryName: K) {}

  /**
   * Generates a once a collection of inputs for a given arbitrary
   */
  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
    return this.isDedupable() ? arbitrary.sampleUnique(sampleSize, [], this.randomGenerator.generator) :
      arbitrary.sample(sampleSize, this.randomGenerator.generator)
  }

  /**
   * Hook that acts as point of extension of the configArbitrary function and that enables an arbitrary to be shrinked.
   */
  shrink<K extends keyof Rec & string>(_name: K, _partial: FluentResult | undefined) {}

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  hasInput<K extends keyof Rec & string>(_arbitraryName: K): boolean {
    throw new Error('Method <hasInput> not implemented.', {
      cause: 'FluentStrategy.hasInput is abstract - subclasses must implement this method'
    })
  }

  /**
   * Retrieves a new input from the arbitraries record.
   */
  getInput<K extends keyof Rec & string>(_arbitraryName: K): FluentPick<Rec[K]> {
    throw new Error('Method <getInput > not implemented.', {
      cause: 'FluentStrategy.getInput is abstract - subclasses must implement this method'
    })
  }

  /**
   * When called this function marks the end of one iteration in the test case generation process. So far, this function
   * is not used but it can be used to perform several operations like keeping a list of generated test cases and save
   * them to a file or even to track coverage.
   */
  handleResult() {
    throw new Error('Method <handleResult> not implemented.', {
      cause: 'FluentStrategy.handleResult is abstract - subclasses must implement this method'
    })
  }
}
