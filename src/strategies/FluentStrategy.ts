import {type Arbitrary, type FluentPick, type FluentRandomGenerator} from '../arbitraries/index.js'
import type {FluentResult} from '../FluentCheck.js'
import {
  type FluentStrategyArbitrary,
  type StrategyArbitraries,
  type StrategyBindings
} from './FluentStrategyTypes.js'
import type {Sampler} from './Sampler.js'
import type {ExecutionStrategy} from './ExecutionStrategy.js'
import type {ShrinkStrategy} from './ShrinkStrategy.js'

export type FluentConfig = { sampleSize?: number, shrinkSize?: number }

export interface FluentStrategyInterface<Rec extends StrategyBindings = StrategyBindings> {
  hasInput: <K extends keyof Rec & string>(arbitraryName: K) => boolean
  getInput: <K extends keyof Rec & string>(arbitraryName: K) => FluentPick<Rec[K]>
  handleResult: () => void
}

export class FluentStrategy<Rec extends StrategyBindings = StrategyBindings>
implements FluentStrategyInterface<Rec> {

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  public arbitraries: StrategyArbitraries<Rec> = {} as StrategyArbitraries<Rec>

  /**
   * Sampler used for generating values from arbitraries.
   */
  private readonly sampler: Sampler

  /**
   * Execution strategy controlling iteration through test cases.
   */
  private readonly executionStrategy: ExecutionStrategy

  /**
   * Shrinking strategy for minimizing counterexamples.
   */
  private readonly shrinkStrategy: ShrinkStrategy

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
    return this.arbitraries[arbitraryName]
  }

  /**
   * Constructor accepting configuration and strategy components.
   *
   * @param configuration - Test generation configuration
   * @param randomGenerator - Random number generator for reproducibility
   * @param sampler - Strategy for generating sample values
   * @param executionStrategy - Strategy for controlling test execution
   * @param shrinkStrategy - Strategy for shrinking counterexamples
   */
  constructor(
    public readonly configuration: FluentConfig,
    public readonly randomGenerator: FluentRandomGenerator,
    sampler: Sampler,
    executionStrategy: ExecutionStrategy,
    shrinkStrategy: ShrinkStrategy
  ) {
    // Ensure sampleSize and shrinkSize are always defined
    this.configuration.sampleSize = this.configuration.sampleSize ?? 1000
    this.configuration.shrinkSize = this.configuration.shrinkSize ?? 500

    this.sampler = sampler
    this.executionStrategy = executionStrategy
    this.shrinkStrategy = shrinkStrategy
  }

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends keyof Rec & string>(arbitraryName: K, a: Arbitrary<Rec[K]>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, pickNum: 0, collection: []}
  }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends keyof Rec & string>(
    arbitraryName: K, partial: FluentResult<Rec> | undefined, depth: number
  ) {
    const state = this.getArbitraryState(arbitraryName)
    state.pickNum = 0
    state.collection = []

    if (depth === 0) {
      state.collection = this.buildArbitraryCollection(state.arbitrary)
    } else if (partial !== undefined) {
      this.shrink(arbitraryName, partial)
    }
  }

  /**
   * Generates a collection of inputs for a given arbitrary.
   */
  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize?: number): FluentPick<A>[] {
    const size = sampleSize ?? this.configuration.sampleSize ?? 1000
    return this.sampler.sample(arbitrary, size)
  }

  /**
   * Shrinks the arbitrary based on a failing example.
   */
  shrink<K extends keyof Rec & string>(arbitraryName: K, partial: FluentResult<Rec> | undefined) {
    if (partial === undefined) return

    const arbitraryState = this.getArbitraryState(arbitraryName)
    const baseArbitrary = arbitraryState.arbitrary
    const counterexample = partial.example[arbitraryName] as FluentPick<Rec[K]>

    arbitraryState.collection = this.shrinkStrategy.shrink(
      baseArbitrary,
      counterexample,
      this.sampler,
      this.configuration.shrinkSize ?? 500
    )
  }

  /**
   * Determines whether there are more inputs to be used for test case generation purposes.
   *
   * Delegates to the execution strategy.
   *
   * @returns true if there are still more inputs to be used; otherwise false.
   */
  hasInput<K extends keyof Rec & string>(arbitraryName: K): boolean {
    const state = this.getArbitraryState(arbitraryName)
    return this.executionStrategy.hasInput(state)
  }

  /**
   * Retrieves a new input from the arbitraries record.
   *
   * Delegates to the execution strategy.
   */
  getInput<K extends keyof Rec & string>(arbitraryName: K): FluentPick<Rec[K]> {
    const state = this.getArbitraryState(arbitraryName)
    return this.executionStrategy.getInput(state)
  }

  /**
   * Marks the end of one iteration in the test case generation process.
   *
   * Delegates to the execution strategy.
   */
  handleResult() {
    this.executionStrategy.handleResult()
  }
}
