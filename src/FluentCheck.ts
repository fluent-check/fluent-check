import {type Arbitrary, type FluentPick, FluentRandomGenerator} from './arbitraries/index.js'
import {type FluentStrategy} from './strategies/FluentStrategy.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'

type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }
type PickResult<V> = Record<string, FluentPick<V>>
type ValueResult<V> = Record<string, V>

/**
 * Error thrown when a precondition fails in a property test.
 * This signals that the current test case should be skipped,
 * not counted as a failure.
 */
export class PreconditionFailure extends Error {
  readonly __brand = 'PreconditionFailure'

  constructor(public readonly message: string = '') {
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
    public readonly seed?: number,
    public skipped: number = 0) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    (this.example as PickResult<A>)[name] = value
  }

  /**
   * Increment the skip counter when a precondition fails.
   */
  addSkipped(count: number = 1) {
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

      if (!this.deepEqual(expectedValue, actualValue)) {
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
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a !== 'object' || typeof b !== 'object') return false

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((val, i) => this.deepEqual(val, b[i]))
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    return keysA.every(key =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }
}

export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
    if (this.parent !== undefined) this.strategy.randomGenerator = this.parent.strategy.randomGenerator
  }

  config(strategy: FluentStrategyFactory) {
    this.strategy = strategy.build()
    return this
  }

  /**
   * Sets up a derived value or constant before assertions.
   *
   * @param name - The name to bind the value to
   * @param v - A constant value or factory function that computes the value
   *
   * @remarks
   * Type inference is controlled: when both constant and factory forms could
   * infer `V`, the factory return type takes precedence. This uses `NoInfer<V>`
   * on the constant position to prevent literal type inference issues (e.g.,
   * inferring `5` instead of `number`).
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
  given<K extends string, V>(
    name: K, v: NoInfer<V> | ((args: Rec) => V)
  ): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return v instanceof Function ?
      new FluentCheckGivenMutable(this, name, v, this.strategy) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy)
  }

  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.strategy)
  }

  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy)
  }

  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.strategy)
  }

  withGenerator(generator: (seed: number) => () => number, seed?: number): FluentCheckGenerator<Rec, ParentRec> {
    return new FluentCheckGenerator(this, generator, this.strategy, seed)
  }

  protected run(
    testCase: WrapFluentPick<Rec> | Rec,
    callback: (arg: WrapFluentPick<Rec> | Rec) => FluentResult): FluentResult {

    return callback(testCase)
  }

  protected pathFromRoot(): FluentCheck<any, any>[] {
    return this.parent !== undefined ? [...this.parent.pathFromRoot(), this] : [this]
  }

  check(
    child: (testCase: WrapFluentPick<any>) => FluentResult<Record<string, unknown>> = () => new FluentResult(true)
  ): FluentResult<Rec> {
    if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child)) as FluentResult<Rec>
    else {
      this.strategy.randomGenerator.initialize()
      const r = this.run({} as Rec, child)
      return new FluentResult<Rec>(r.satisfiable, FluentCheck.unwrapFluentPick(r.example) as Rec,
        this.strategy.randomGenerator.seed, r.skipped)
    }
  }

  static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
    const result: Record<string, T> = {}
    for (const k in testCase) result[k] = testCase[k].value
    return result
  }

  setRandomGenerator(prng: FluentRandomGenerator) {
    this.strategy.randomGenerator = prng
    this.parent?.setRandomGenerator(prng)
  }
}

class FluentCheckWhen<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly f: (givens: Rec) => void,
    strategy: FluentStrategy) {

    super(strategy, parent)
  }

  and(f: (givens: Rec) => void) { return this.when(f) }
}

abstract class FluentCheckGiven<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    strategy: FluentStrategy) {

    super(strategy, parent)
  }

  /**
   * Chains an additional derived value after a given clause.
   *
   * @remarks
   * Type inference follows the same rules as `given()`: factory return type
   * is the primary inference source for `V`. Uses `NoInfer<V>` on the constant
   * position.
   */
  and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | NoInfer<V>) {
    return super.given(name, f)
  }
}

class FluentCheckGivenMutable<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly factory: (args: ParentRec) => V,
    strategy: FluentStrategy) {

    super(parent, name, strategy)
  }
}

class FluentCheckGivenConstant<K extends string, V, Rec extends ParentRec & Record<K, V>, ParentRec extends {}>
  extends FluentCheckGiven<K, V, Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly value: V,
    strategy: FluentStrategy) {

    super(parent, name, strategy)
  }

  protected override run(testCase: Rec, callback: (arg: Rec) => FluentResult) {
    (testCase as Record<string, V>)[this.name] = this.value
    return callback(testCase)
  }
}

abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly name: K,
    public readonly a: Arbitrary<A>,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.strategy.addArbitrary(this.name, a)
  }

  protected override run(
    testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult,
    partial: FluentResult | undefined = undefined,
    depth = 0,
    accumulatedSkips = 0): FluentResult {

    this.strategy.configArbitrary(this.name, partial, depth)

    let totalSkipped = accumulatedSkips

    while (this.strategy.hasInput(this.name)) {
      testCase[this.name] = this.strategy.getInput(this.name)
      const result = callback(testCase)
      totalSkipped += result.skipped
      if (result.satisfiable === this.breakValue) {
        result.addExample(this.name, testCase[this.name])
        return this.run(testCase, callback, result, depth + 1, totalSkipped)
      }
    }

    const finalResult = partial ?? new FluentResult(!this.breakValue)
    finalResult.skipped = totalSkipped
    return finalResult
  }

  abstract breakValue: boolean
}

class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = false
}

class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = true
}

class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  preliminaries: FluentCheck<unknown, any>[]

  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    public readonly assertion: (args: Rec) => boolean,
    strategy: FluentStrategy) {

    super(strategy, parent)
    this.preliminaries = this.pathFromRoot().filter(node =>
      node instanceof FluentCheckGivenMutable ||
      node instanceof FluentCheckWhen)
  }

  and(assertion: (args: Rec) => boolean) {
    return this.then(assertion)
  }

  private runPreliminaries<T>(testCase: ValueResult<T>): Rec {
    const data: Record<string, unknown> = {}

    this.preliminaries.forEach(node => {
      if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory({...testCase, ...data})
      else if (node instanceof FluentCheckWhen) node.f({...testCase, ...data})
    })

    return data as Rec
  }

  protected override run(testCase: WrapFluentPick<Rec>,
    callback: (arg: WrapFluentPick<Rec>) => FluentResult): FluentResult {
    const unwrappedTestCase = FluentCheck.unwrapFluentPick(testCase)
    try {
      const passed = this.assertion({...unwrappedTestCase, ...this.runPreliminaries(unwrappedTestCase)} as Rec)
      if (passed) {
        return callback(testCase)
      } else {
        return new FluentResult(false)
      }
    } catch (e) {
      if (e instanceof PreconditionFailure) {
        // Precondition failed - skip this test case
        // Return satisfiable=true so quantifier continues with other cases
        const result = callback(testCase)
        result.addSkipped()
        return result
      }
      throw e // Re-throw other errors
    }
  }
}

class FluentCheckGenerator<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any>,
    readonly rngBuilder: (seed: number) => () => number,
    strategy: FluentStrategy,
    readonly seed?: number
  ) {
    super(strategy, parent)

    this.setRandomGenerator(new FluentRandomGenerator(rngBuilder, seed))
  }
}
