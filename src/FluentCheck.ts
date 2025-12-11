import {type Arbitrary, type FluentPick} from './arbitraries/index.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
import {createExecutableScenario} from './ExecutableScenario.js'
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
import type {ExplorationBudget} from './strategies/Explorer.js'
import type {BoundTestCase} from './strategies/types.js'
import {type FluentStatistics, type CoverageResult, wilsonScoreInterval} from './statistics.js'

type PickResult<V> = BoundTestCase<Record<string, V>>
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

type ExecutionConfig = {
  strategyFactory?: FluentStrategyFactory
  rngBuilder?: (seed: number) => () => number
  seed?: number | undefined
}

/**
 * Error thrown when a precondition fails in a property test.
 * This signals that the current test case should be skipped,
 * not counted as a failure.
 */
export class PreconditionFailure extends Error {
  readonly __brand = 'PreconditionFailure'

  constructor(public override readonly message = '') {
    super(message)
    this.name = 'PreconditionFailure'
  }
}

/**
 * Assert a precondition within a property test body.
 * If the condition is false, the test case is skipped (not counted as pass or fail).
 *
 * @param condition - The precondition to check
 * @param message - Optional message for debugging skipped cases
 *
 * @example
 * ```typescript
 * fc.scenario()
 *   .forall('a', fc.integer())
 *   .forall('b', fc.integer())
 *   .then(({ a, b }) => {
 *     fc.pre(b !== 0);  // Skip if b is zero
 *     return a / b * b + a % b === a;
 *   })
 *   .check();
 *
 * // With message
 * fc.pre(arr.length > 0, 'array must be non-empty');
 * ```
 */
export function pre(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new PreconditionFailure(message)
  }
}

export class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly statistics: FluentStatistics,
    public readonly seed?: number,
    public skipped = 0) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    (this.example as PickResult<A>)[name] = value
  }

  /**
   * Increment the skip counter when a precondition fails.
   */
  addSkipped(count = 1) {
    this.skipped += count
  }

  /**
   * Assert that the property test found a satisfying example.
   * Throws an error with a descriptive message if the result is not satisfiable.
   *
   * @param message - Optional custom message prefix for the error
   * @throws Error if the result is not satisfiable
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('x', fc.integer())
   *   .then(({ x }) => x + 0 === x)
   *   .check()
   *   .assertSatisfiable();
   * ```
   */
  assertSatisfiable(message?: string): void {
    if (!this.satisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const exampleStr = JSON.stringify(this.example)
      const seedStr = this.seed !== undefined ? ` (seed: ${this.seed})` : ''
      throw new Error(`${prefix}Expected property to be satisfiable, but found counterexample: ${exampleStr}${seedStr}`)
    }
  }

  /**
   * Assert that the property test did NOT find a satisfying example.
   * Throws an error with a descriptive message if the result is satisfiable.
   *
   * @param message - Optional custom message prefix for the error
   * @throws Error if the result is satisfiable
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .forall('x', fc.integer())
   *   .then(({ x }) => x !== x)  // Always false
   *   .check()
   *   .assertNotSatisfiable();
   * ```
   */
  assertNotSatisfiable(message?: string): void {
    if (this.satisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const exampleStr = JSON.stringify(this.example)
      const seedStr = this.seed !== undefined ? ` (seed: ${this.seed})` : ''
      throw new Error(`${prefix}Expected property to NOT be satisfiable, but found example: ${exampleStr}${seedStr}`)
    }
  }

  /**
   * Assert that the found example matches the expected partial object.
   * Performs a partial match: only the keys present in `expected` are compared.
   *
   * @param expected - Partial object to match against the example
   * @param message - Optional custom message prefix for the error
   * @throws Error if any property in `expected` does not match the example
   *
   * @example
   * ```typescript
   * const result = fc.scenario()
   *   .exists('a', fc.integer())
   *   .forall('b', fc.integer(-10, 10))
   *   .then(({ a, b }) => a + b === b)
   *   .check();
   *
   * result.assertSatisfiable();
   * result.assertExample({ a: 0 });  // Partial match
   * ```
   */
  assertExample(expected: Partial<Rec>, message?: string): void {
    const mismatches: string[] = []

    for (const key of Object.keys(expected) as Array<keyof Rec>) {
      const expectedValue = expected[key]
      const actualValue = this.example[key]

      if (!this.#deepEqual(expectedValue, actualValue)) {
        mismatches.push(`${String(key)}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
      }
    }

    if (mismatches.length > 0) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const seedStr = this.seed !== undefined ? ` (seed: ${this.seed})` : ''
      throw new Error(`${prefix}Example mismatch - ${mismatches.join('; ')}${seedStr}`)
    }
  }

  /**
   * Deep equality comparison for values.
   */
  #deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a !== 'object' || typeof b !== 'object') return false

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((val, i) => this.#deepEqual(val, b[i]))
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    return keysA.every(key =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      this.#deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }
}

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

  check(): FluentResult<Rec> {
    const path = this.pathFromRoot()
    const root = path[0] as FluentCheck<any, any>

    // Build scenario AST and compile to executable form
    const scenario = this.buildScenario()
    const executableScenario = createExecutableScenario(scenario)

    const {strategyFactory, rngBuilder, seed} = root.#resolveExecutionConfig(path)

    const factory: FluentStrategyFactory<Rec> =
      (strategyFactory as FluentStrategyFactory<Rec> | undefined) ??
      new FluentStrategyFactory<Rec>().defaultStrategy()

    // Configure RNG on the factory before building
    if (rngBuilder !== undefined) {
      factory.withRandomGenerator(rngBuilder, seed)
    }

    // Build components from factory
    const explorer = factory.buildExplorer()
    const shrinker = factory.buildShrinker()
    const shrinkBudget = factory.buildShrinkBudget()
    const {sampler, randomGenerator} = factory.buildStandaloneSampler()

    const explorationBudget: ExplorationBudget = {
      maxTests: factory.configuration.sampleSize ?? 1000
    }

    // Build property function from scenario's then nodes
    const property = this.#buildPropertyFunction(scenario)

    // Track execution time
    const startTime = Date.now()

    // Explore the search space
    const explorationResult = explorer.explore(
      executableScenario,
      property,
      sampler,
      explorationBudget
    )

    const endTime = Date.now()
    const executionTimeMs = endTime - startTime

    // Helper function to calculate statistics
    const calculateStatistics = (
      testsRun: number,
      skipped: number,
      executionTimeMs: number,
      counterexampleFound: boolean,
      labels?: Record<string, number>
    ): FluentStatistics => {
      const stats: FluentStatistics = {
        testsRun,
        // testsPassed counts tests where property held (excluding discarded and counterexample if any)
        testsPassed: counterexampleFound ? testsRun - skipped - 1 : testsRun - skipped,
        testsDiscarded: skipped,
        executionTimeMs
      }

      // Calculate label percentages if labels are present
      if (labels !== undefined) {
        stats.labels = labels
        if (testsRun > 0) {
          const labelPercentages: Record<string, number> = {}
          for (const [label, count] of Object.entries(labels)) {
            labelPercentages[label] = (count / testsRun) * 100
          }
          stats.labelPercentages = labelPercentages
        }
        // If no tests run, percentages remain undefined (don't set explicitly)
      }

      return stats
    }

    // Handle exploration result
    if (explorationResult.outcome === 'passed') {
      // Extract witness values if available (for exists scenarios)
      if (scenario.hasExistential && explorationResult.witness !== undefined) {
        // Shrink the witness to find the minimal satisfying values
        const shrinkResult = shrinker.shrinkWitness(
          explorationResult.witness,
          executableScenario,
          explorer,
          property,
          sampler,
          shrinkBudget
        )

        // Filter to only include existential quantifiers' values
        const existentialNames = new Set(
          scenario.quantifiers
            .filter(q => q.type === 'exists')
            .map(q => q.name)
        )

        const example: Record<string, unknown> = {}
        for (const [key, pick] of Object.entries(shrinkResult.minimized)) {
          if (existentialNames.has(key)) {
            example[key] = (pick as FluentPick<unknown>).value
          }
        }

        return new FluentResult<Rec>(
          true,
          example as Rec,
          calculateStatistics(
            explorationResult.testsRun,
            explorationResult.skipped,
            executionTimeMs,
            false,
            explorationResult.labels
          ),
          randomGenerator.seed,
          explorationResult.skipped
        )
      }

      // For forall-only scenarios that pass, return empty example
      return new FluentResult<Rec>(
        true,
        {} as Rec,
        // eslint-disable-next-line max-len
        calculateStatistics(explorationResult.testsRun, explorationResult.skipped, executionTimeMs, false, explorationResult.labels),
        randomGenerator.seed,
        explorationResult.skipped
      )
    }

    if (explorationResult.outcome === 'exhausted') {
      // For forall-only scenarios, exhausted budget without counterexample is a (incomplete) pass.
      // For scenarios with exists, exhausted budget means no witness found.
      const satisfiable = !scenario.hasExistential
      return new FluentResult<Rec>(
        satisfiable,
        {} as Rec,
        // eslint-disable-next-line max-len
        calculateStatistics(explorationResult.testsRun, explorationResult.skipped, executionTimeMs, false, explorationResult.labels),
        randomGenerator.seed,
        explorationResult.skipped
      )
    }

    // Found a counterexample - apply shrinking
    const counterexample = explorationResult.counterexample

    const shrinkResult = shrinker.shrink(
      counterexample,
      executableScenario,
      explorer,
      property,
      sampler,
      shrinkBudget
    )

    // Convert shrunk counterexample to FluentResult
    return new FluentResult<Rec>(
      false,
      FluentCheck.unwrapFluentPick(shrinkResult.minimized) as Rec,
      calculateStatistics(
        explorationResult.testsRun,
        explorationResult.skipped,
        executionTimeMs,
        true,
        explorationResult.labels
      ),
      randomGenerator.seed,
      explorationResult.skipped
    )
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
    const confidence = options?.confidence ?? 0.95
    if (confidence <= 0 || confidence >= 1) {
      throw new Error(`Confidence level must be between 0 and 1, got ${confidence}`)
    }

    // Execute tests (same as check())
    const result = this.check()

    // Extract coverage nodes from scenario
    const scenario = this.buildScenario()
    const coverNodes = scenario.nodes.filter(
      (node): node is CoverNode<Rec> => node.type === 'cover'
    )
    const coverTableNodes = scenario.nodes.filter(
      (node): node is CoverTableNode<Rec> => node.type === 'coverTable'
    )

    // If no coverage requirements, return result as-is
    if (coverNodes.length === 0 && coverTableNodes.length === 0) {
      return result
    }

    // Build coverage requirements list
    const coverageRequirements: Array<{ label: string; requiredPercentage: number }> = []

    // Add cover node requirements
    for (const node of coverNodes) {
      coverageRequirements.push({
        label: node.label,
        requiredPercentage: node.requiredPercentage
      })
    }

    // Add coverTable node requirements (one per category)
    for (const node of coverTableNodes) {
      for (const [category, percentage] of Object.entries(node.categories)) {
        coverageRequirements.push({
          label: `${node.name}.${category}`,
          requiredPercentage: percentage
        })
      }
    }

    // Verify coverage requirements
    const coverageResults: CoverageResult[] = []
    const unsatisfied: string[] = []

    const labels = result.statistics.labels ?? {}
    const testsRun = result.statistics.testsRun

    for (const requirement of coverageRequirements) {
      const labelCount = labels[requirement.label] ?? 0
      const observedPercentage = testsRun > 0 ? (labelCount / testsRun) * 100 : 0

      // Calculate Wilson score interval for observed percentage
      const [lower, upper] = wilsonScoreInterval(labelCount, testsRun, confidence)
      const confidenceInterval: [number, number] = [lower * 100, upper * 100]

      // Check if required percentage is within confidence interval
      // Requirement is satisfied if required percentage is <= upper bound
      // (i.e., we're confident the true percentage is at least the required amount)
      const requiredPct = requirement.requiredPercentage / 100
      const satisfied = requiredPct <= upper

      coverageResults.push({
        label: requirement.label,
        requiredPercentage: requirement.requiredPercentage,
        observedPercentage,
        satisfied,
        confidenceInterval,
        confidence
      })

      if (!satisfied) {
        const ciStr = `[${confidenceInterval[0].toFixed(2)}, ${confidenceInterval[1].toFixed(2)}]`
        unsatisfied.push(
          `${requirement.label}: required ${requirement.requiredPercentage}%, ` +
          `observed ${observedPercentage.toFixed(2)}% (CI: ${ciStr})`
        )
      }
    }

    // Add coverage results to statistics
    const updatedStatistics: FluentStatistics = {
      ...result.statistics,
      coverageResults
    }

    // Create new result with coverage verification
    const coverageResult = new FluentResult<Rec>(
      result.satisfiable && unsatisfied.length === 0,
      result.example,
      updatedStatistics,
      result.seed,
      result.skipped
    )

    // Throw error if any requirements not satisfied
    if (unsatisfied.length > 0) {
      const errorMessage = `Coverage requirements not satisfied:\n${unsatisfied.map(req => `  - ${req}`).join('\n')}`
      throw new Error(errorMessage)
    }

    return coverageResult
  }

  /**
   * Builds a property function from scenario's then nodes and given/when nodes.
   */
  #buildPropertyFunction(scenario: Scenario<Rec>): (testCase: Rec) => boolean {
    const givenNodes: GivenNode<Rec>[] = []
    const whenNodes: WhenNode<Rec>[] = []
    const thenNodes: ThenNode<Rec>[] = []

    for (const node of scenario.nodes) {
      switch (node.type) {
        case 'given':
          givenNodes.push(node)
          break
        case 'when':
          whenNodes.push(node)
          break
        case 'then':
          thenNodes.push(node)
          break
      }
    }

    return (testCase: Rec): boolean => {
      // Apply given predicates to compute derived values
      const fullTestCase: Record<string, unknown> = {...testCase}

      for (const given of givenNodes) {
        if (given.isFactory) {
          const factory = given.predicate as (args: Rec) => unknown
          fullTestCase[given.name] = factory(fullTestCase as Rec)
        } else {
          fullTestCase[given.name] = given.predicate
        }
      }

      // Execute when predicates (side effects)
      for (const when of whenNodes) {
        when.predicate(fullTestCase as Rec)
      }

      // Evaluate all then predicates
      for (const then of thenNodes) {
        if (!then.predicate(fullTestCase as Rec)) {
          return false
        }
      }

      return true
    }
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
