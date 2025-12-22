import {type Arbitrary} from './arbitraries/index.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
import {
  type Scenario,
  type ScenarioNode,
  type ForallNode,
  type ExistsNode,
  type GivenNode,
  type WhenNode,
  type ThenNode,
  type ClassifyNode,
  type LabelNode,
  type CollectNode,
  type CoverNode,
  type CoverTableNode,
  createScenario
} from './Scenario.js'
import type {BoundTestCase} from './strategies/types.js'
import type {FluentStatistics} from './statistics.js'
import {FluentResult} from './FluentResult.js'
import type {CheckOptions} from './check/CheckOptions.js'
import type {ExecutionConfig} from './check/runCheck.js'
import {runCheck} from './check/runCheck.js'
import {verifyCoverage} from './statisticsCoverage.js'

// Re-export for backwards compatibility
export {PreconditionFailure, pre} from './check/preconditions.js'
export {event, target} from './statisticsEvents.js'
export type {ProgressInfo, CheckOptions} from './check/CheckOptions.js'
export {FluentResult} from './FluentResult.js'

type ValueResult<V> = Record<string, V>

// Utility types
type Prettify<T> = { [K in keyof T]: T[K] } & {}

// Only enforce freshness when Rec has "narrow" (non-broad) keys.
type HasLiteralKeys<Rec> =
  string extends keyof Rec ? false :
  number extends keyof Rec ? false :
  symbol extends keyof Rec ? false :
  true

type FreshName<Rec, K extends string> =
  HasLiteralKeys<Rec> extends true
    ? (K extends keyof Rec ? `Error: '${K}' is already bound in this scenario` : K)
    : K

export class FluentCheck<
  Rec extends ParentRec,
  ParentRec extends {} = {}
> {
  private strategyFactory?: FluentStrategyFactory

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
  ) {}

  config(strategy: FluentStrategyFactory<Rec>) {
    this.strategyFactory = strategy as FluentStrategyFactory
    return this
  }

  /**
   * Sets up a derived value or constant before assertions.
   *
   * @param name - The name to bind the value to
   * @param v - A constant value or factory function that computes the value
   *
   * @remarks
   * Overloads prefer the factory form when a function is provided so inference
   * flows from the factory return type. Constant values still infer `V` from
   * the provided value instead of falling back to `unknown`.
   *
   * @example
   * ```typescript
   * // Factory form - V inferred from return type
   * .given('stack', () => new Stack<number>())
   *
   * // Constant form - still works, but factory wins in unions
   * .given('count', 42)
   * ```
   */
  given<const K extends string, V>(
    name: FreshName<Rec, K>,
    factory: (args: Rec) => V
  ): FluentCheckGiven<FreshName<Rec, K>, V, Prettify<Rec & Record<FreshName<Rec, K>, V>>, Rec>
  given<const K extends string, V>(
    name: FreshName<Rec, K>,
    value: V
  ): FluentCheckGiven<FreshName<Rec, K>, V, Prettify<Rec & Record<FreshName<Rec, K>, V>>, Rec>
  given<const K extends string, V>(
    name: FreshName<Rec, K>, v: V | ((args: Rec) => V)
  ): FluentCheckGiven<FreshName<Rec, K>, V, Prettify<Rec & Record<FreshName<Rec, K>, V>>, Rec> {
    return v instanceof Function
      ? new FluentCheckGivenMutable(this, name, v)
      : new FluentCheckGivenConstant(this, name, v)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f)
  }

  forall<const K extends string, A>(
    name: FreshName<Rec, K>,
    a: Arbitrary<A>
  ): FluentCheck<Prettify<Rec & Record<FreshName<Rec, K>, A>>, Rec> {
    return new FluentCheckUniversal(this, name, a)
  }

  exists<const K extends string, A>(
    name: FreshName<Rec, K>,
    a: Arbitrary<A>
  ): FluentCheck<Prettify<Rec & Record<FreshName<Rec, K>, A>>, Rec> {
    return new FluentCheckExistential(this, name, a)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f)
  }

  /**
   * Classifies test cases by a predicate. When the predicate returns true,
   * the label is counted in the statistics.
   *
   * @param predicate - Function that returns true when the test case matches this classification
   * @param label - Label string to count when predicate is true
   * @returns A new FluentCheck instance with the classification node added
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .classify(({xs}) => xs.length === 0, 'empty')
   *   .classify(({xs}) => xs.length < 5, 'small')
   *   .then(({xs}) => xs.sort().length === xs.length)
   *   .check()
   * ```
   */
  classify(predicate: (args: Rec) => boolean, classificationLabel: string): FluentCheckClassify<Rec, ParentRec> {
    return new FluentCheckClassify(this, predicate, classificationLabel)
  }

  /**
   * Dynamically labels test cases. The function is evaluated for each test case
   * and the returned string is used as a label and counted.
   *
   * @param fn - Function that returns a label string for each test case
   * @returns A new FluentCheck instance with the label node added
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('x', fc.integer(-100, 100))
   *   .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
   *   .then(({x}) => Math.abs(x) >= 0)
   *   .check()
   * ```
   */
  label(fn: (args: Rec) => string): FluentCheckLabel<Rec, ParentRec> {
    return new FluentCheckLabel(this, fn)
  }

  /**
   * Collects values from test cases. The function is evaluated for each test case
   * and the returned value (string or number) is used as a label and counted.
   *
   * @param fn - Function that returns a value (string or number) for each test case
   * @returns A new FluentCheck instance with the collect node added
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .collect(({xs}) => xs.length)
   *   .then(({xs}) => true)
   *   .check()
   * ```
   */
  collect(fn: (args: Rec) => string | number): FluentCheckCollect<Rec, ParentRec> {
    return new FluentCheckCollect(this, fn)
  }

  /**
   * Specifies a coverage requirement with a minimum percentage.
   * The predicate is evaluated for each test case, and the label is counted when true.
   * After test execution, the coverage requirement is verified using statistical confidence intervals.
   *
   * @param percentage - Required minimum percentage (0-100)
   * @param predicate - Function that returns true when the test case matches this coverage requirement
   * @param label - Label string to count when predicate is true
   * @returns A new FluentCheck instance with the coverage node added
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('x', fc.integer(-100, 100))
   *   .cover(10, ({x}) => x < 0, 'negative')
   *   .cover(10, ({x}) => x > 0, 'positive')
   *   .then(({x}) => Math.abs(x) >= 0)
   *   .checkCoverage()
   * ```
   */
  cover(
    percentage: number,
    predicate: (args: Rec) => boolean,
    label: string
  ): FluentCheckCover<Rec, ParentRec> {
    if (percentage < 0 || percentage > 100) {
      throw new Error(`Coverage percentage must be between 0 and 100, got ${percentage}`)
    }
    return new FluentCheckCover(this, predicate, label, percentage)
  }

  /**
   * Specifies tabular coverage requirements with multiple categories.
   * Each category has its own required percentage, and the getCategory function
   * determines which category each test case belongs to.
   *
   * @param name - Name of the coverage table
   * @param categories - Object mapping category names to required percentages (0-100)
   * @param getCategory - Function that returns the category name for each test case
   * @returns A new FluentCheck instance with the coverage table node added
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .coverTable('sizes', { empty: 5, small: 20, large: 20 },
   *     ({xs}) => xs.length === 0 ? 'empty' : xs.length < 10 ? 'small' : 'large')
   *   .then(({xs}) => xs.sort().length === xs.length)
   *   .checkCoverage()
   * ```
   */
  coverTable(
    name: string,
    categories: Record<string, number>,
    getCategory: (args: Rec) => string
  ): FluentCheckCoverTable<Rec, ParentRec> {
    // Validate category percentages
    for (const [category, percentage] of Object.entries(categories)) {
      if (percentage < 0 || percentage > 100) {
        throw new Error(`Coverage percentage for category "${category}" must be between 0 and 100, got ${percentage}`)
      }
    }
    return new FluentCheckCoverTable(this, name, categories, getCategory)
  }

  withGenerator(
    generator: (seed: number) => () => number,
    seed?: number
  ): FluentCheckGenerator<Rec, ParentRec> {
    return new FluentCheckGenerator(this, generator, seed)
  }

  protected pathFromRoot(): FluentCheck<any, any>[] {
    return this.parent !== undefined ? [...this.parent.pathFromRoot(), this] : [this]
  }

  /**
   * Extracts the scenario node representation of this FluentCheck node.
   * Override in subclasses to provide specific node types.
   * Returns undefined for nodes that don't contribute to the scenario (e.g., root, generator).
   */
  protected toScenarioNode(): ScenarioNode<Rec> | undefined {
    return undefined
  }

  /**
   * Builds an immutable Scenario AST from this FluentCheck chain.
   *
   * The scenario captures the complete structure of the property test,
   * including all quantifiers, given clauses, when clauses, and assertions.
   * Node order matches the chain order from root to leaf.
   *
   * @returns A Scenario<Rec> representing this FluentCheck chain
   *
   * @example
   * ```typescript
   * const scenario = fc.scenario()
   *   .forall('x', fc.integer())
   *   .forall('y', fc.integer())
   *   .then(({ x, y }) => x + y === y + x)
   *   .buildScenario();
   *
   * console.log(scenario.quantifiers.length); // 2
   * console.log(scenario.hasExistential);     // false
   * ```
   */
  buildScenario(): Scenario<Rec> {
    const path = this.pathFromRoot()
    const nodes: ScenarioNode<Rec>[] = []

    for (const node of path) {
      const scenarioNode = node.toScenarioNode()
      if (scenarioNode !== undefined) {
        nodes.push(scenarioNode as ScenarioNode<Rec>)
      }
    }

    return createScenario(nodes)
  }

  check(options?: CheckOptions): FluentResult<Rec> {
    const scenario = this.buildScenario()
    const executionConfig = this.#resolveExecutionConfig(this.pathFromRoot())
    return runCheck(scenario, executionConfig, options)
  }

  /**
   * Check the property with a target confidence level.
   * Executes tests until the specified confidence level is achieved.
   *
   * @param level - Target confidence level (0 < level < 1), e.g., 0.99 for 99% confidence
   * @param options - Optional configuration
   * @returns A FluentResult with confidence statistics
   * @throws Error if level is not between 0 and 1
   *
   * @example
   * ```typescript
   * const result = fc.scenario()
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .checkWithConfidence(0.999)
   *
   * console.log(result.statistics.confidence)       // 0.9992
   * console.log(result.statistics.testsRun)         // 6905 (variable)
   * console.log(result.statistics.credibleInterval) // [0.9995, 1.0]
   * ```
   */
  checkWithConfidence(level: number, options?: CheckOptions): FluentResult<Rec> {
    if (level <= 0 || level >= 1) {
      throw new Error(`Confidence level must be between 0 and 1, got ${level}`)
    }

    // Build scenario and execute with the configured factory
    const scenario = this.buildScenario()
    const path = this.pathFromRoot()
    const baseConfig = this.#resolveExecutionConfig(path)

    // Clone the existing factory if it exists, otherwise create a new one
    const baseFactory = baseConfig.strategyFactory as FluentStrategyFactory<Rec> | undefined
    const factory = baseFactory !== undefined
      ? baseFactory.clone()
      : new FluentStrategyFactory<Rec>()

    // Configure with confidence target (only override confidence-related settings)
    factory.withConfidence(level)

    // Use a reasonable default for maxIterations (10x sample size or 50000, whichever is smaller)
    const sampleSize = factory.configuration.sampleSize ?? 1000
    const maxIterations = Math.min(sampleSize * 10, 50000)
    factory.withMaxIterations(maxIterations)

    const executionConfig: ExecutionConfig = {
      ...baseConfig,
      strategyFactory: factory
    }

    return runCheck(scenario, executionConfig, options)
  }

  /**
   * Check the property and verify coverage requirements.
   * Executes tests and verifies that all coverage requirements are satisfied using statistical confidence intervals.
   *
   * @param options - Optional configuration
   * @param options.confidence - Confidence level for coverage verification (default 0.95)
   * @returns A FluentResult with coverage verification results
   * @throws Error if coverage requirements are not satisfied
   *
   * @example
   * ```typescript
   * const result = fc.scenario()
   *   .forall('x', fc.integer(-100, 100))
   *   .cover(10, ({x}) => x < 0, 'negative')
   *   .cover(10, ({x}) => x > 0, 'positive')
   *   .then(({x}) => Math.abs(x) >= 0)
   *   .checkCoverage({ confidence: 0.99 })
   *
   * // Check coverage results
   * if (result.statistics.coverageResults) {
   *   for (const coverage of result.statistics.coverageResults) {
   *     console.log(`${coverage.label}: ${coverage.satisfied ? 'PASS' : 'FAIL'}`)
   *   }
   * }
   * ```
   */
  checkCoverage(options?: { confidence?: number }): FluentResult<Rec> {
    // Execute tests (same as check())
    const result = this.check()

    // Extract coverage nodes from scenario
    const scenario = this.buildScenario()

    // Verify coverage requirements
    const verification = verifyCoverage(scenario, result.statistics, options)

    // If no coverage requirements, return result as-is (preserving undefined coverageResults)
    if (verification.coverageResults.length === 0) {
      return result
    }

    // Add coverage results to statistics
    const updatedStatistics: FluentStatistics = {
      ...result.statistics,
      coverageResults: verification.coverageResults
    }

    // Create new result with coverage verification
    const coverageResult = new FluentResult<Rec>(
      result.satisfiable && verification.allSatisfied,
      result.example,
      updatedStatistics,
      result.seed,
      result.skipped
    )

    // Throw error if any requirements not satisfied
    if (!verification.allSatisfied) {
      const unsatisfiedList = verification.unsatisfied.map(req => `  - ${req}`).join('\n')
      throw new Error(`Coverage requirements not satisfied:\n${unsatisfiedList}`)
    }

    return coverageResult
  }

  static unwrapFluentPick<T>(testCase: BoundTestCase<Record<string, T>>): ValueResult<T> {
    // TypeScript 5.5 automatically infers NonNullable from filter predicate
    const entries = Object.entries(testCase)
      .filter(([, pick]) => pick !== undefined)
      .map(([k, pick]) => [k, pick.value] as const)
    return Object.fromEntries(entries)
  }

  #resolveExecutionConfig(path: FluentCheck<any, any>[]): ExecutionConfig {
    const config: ExecutionConfig = {}

    for (const node of path) {
      if (node.strategyFactory !== undefined) {
        config.strategyFactory = node.strategyFactory
      }
      if (node instanceof FluentCheckGenerator) {
        config.rngBuilder = node.rngBuilder
        config.seed = node.seed
      }
    }

    return config
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly f: (givens: Rec) => void) {

    super(parent)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }

  protected override toScenarioNode(): WhenNode<Rec> {
    return {
      type: 'when',
      predicate: this.f
    }
  }
}

abstract class FluentCheckGiven<
  K extends string,
  V,
  Rec extends ParentRec & Record<K, V>,
  ParentRec extends {}
> extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K) {

    super(parent)
  }

  /**
   * Chains an additional derived value after a given clause.
   *
   * @remarks
   * Type inference follows the same rules as `given()`: factory return type
   * is preferred when a function is provided, and constants infer `V` directly.
   */
  and<const K extends string, V>(
    name: FreshName<Rec, K>,
    factory: (args: Rec) => V
  ): FluentCheckGiven<FreshName<Rec, K>, V, Prettify<Rec & Record<FreshName<Rec, K>, V>>, Rec>
  and<const K extends string, V>(
    name: FreshName<Rec, K>,
    value: V
  ): FluentCheckGiven<FreshName<Rec, K>, V, Prettify<Rec & Record<FreshName<Rec, K>, V>>, Rec>
  and<const K extends string, V>(name: FreshName<Rec, K>, f: V | ((args: Rec) => V)) {
    return super.given(name, f)
  }
}

class FluentCheckGivenMutable<
  K extends string,
  V,
  Rec extends ParentRec & Record<K, V>,
  ParentRec extends {}
> extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public override readonly name: K,
    public readonly factory: (args: ParentRec) => V) {

    super(parent, name)
  }

  protected override toScenarioNode(): GivenNode<ParentRec> {
    return {
      type: 'given',
      name: this.name,
      predicate: this.factory,
      isFactory: true
    }
  }
}

class FluentCheckGivenConstant<
  K extends string,
  V,
  Rec extends ParentRec & Record<K, V>,
  ParentRec extends {}
> extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public override readonly name: K,
    public readonly value: V) {

    super(parent, name)
  }

  protected override toScenarioNode(): GivenNode<ParentRec> {
    return {
      type: 'given',
      name: this.name,
      predicate: this.value,
      isFactory: false
    }
  }
}

abstract class FluentCheckQuantifier<
  K extends string,
  A,
  Rec extends ParentRec & Record<K, A>,
  ParentRec extends {}
> extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>) {

    super(parent)
  }

  abstract breakValue: boolean
}

class FluentCheckUniversal<
  K extends string,
  A,
  Rec extends ParentRec & Record<K, A>,
  ParentRec extends {}
> extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = false

  protected override toScenarioNode(): ForallNode<A> {
    return {
      type: 'forall',
      name: this.name,
      arbitrary: this.a
    }
  }
}

class FluentCheckExistential<
  K extends string,
  A,
  Rec extends ParentRec & Record<K, A>,
  ParentRec extends {}
> extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = true

  protected override toScenarioNode(): ExistsNode<A> {
    return {
      type: 'exists',
      name: this.name,
      arbitrary: this.a
    }
  }
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly assertion: (args: Rec) => boolean) {

    super(parent)
  }

  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
  }

  protected override toScenarioNode(): ThenNode<Rec> {
    return {
      type: 'then',
      predicate: this.assertion
    }
  }
}

class FluentCheckGenerator<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    readonly rngBuilder: (seed: number) => () => number,
    readonly seed?: number
  ) {
    super(parent)
  }
}

class FluentCheckClassify<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly predicate: (args: Rec) => boolean,
    public readonly classificationLabel: string
  ) {
    super(parent)
  }

  protected override toScenarioNode(): ClassifyNode<Rec> {
    return {
      type: 'classify',
      predicate: this.predicate,
      label: this.classificationLabel
    }
  }
}

class FluentCheckLabel<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly fn: (args: Rec) => string
  ) {
    super(parent)
  }

  protected override toScenarioNode(): LabelNode<Rec> {
    return {
      type: 'label',
      fn: this.fn
    }
  }
}

class FluentCheckCollect<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly fn: (args: Rec) => string | number
  ) {
    super(parent)
  }

  protected override toScenarioNode(): CollectNode<Rec> {
    return {
      type: 'collect',
      fn: this.fn
    }
  }
}

class FluentCheckCover<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly predicate: (args: Rec) => boolean,
    public readonly coverLabel: string,
    public readonly requiredPercentage: number
  ) {
    super(parent)
  }

  protected override toScenarioNode(): CoverNode<Rec> {
    return {
      type: 'cover',
      predicate: this.predicate,
      label: this.coverLabel,
      requiredPercentage: this.requiredPercentage
    }
  }
}

class FluentCheckCoverTable<Rec extends ParentRec, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected override readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: string,
    public readonly categories: Record<string, number>,
    public readonly getCategory: (args: Rec) => string
  ) {
    super(parent)
  }

  protected override toScenarioNode(): CoverTableNode<Rec> {
    return {
      type: 'coverTable',
      name: this.name,
      categories: this.categories,
      getCategory: this.getCategory
    }
  }
}
