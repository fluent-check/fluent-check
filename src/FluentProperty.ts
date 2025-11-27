import {Arbitrary} from './arbitraries/index.js'
import {FluentCheck, FluentResult} from './FluentCheck.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'

/**
 * A fluent property test builder that provides a simplified API for property-based testing.
 *
 * @typeParam Args - Tuple type of the generated values from arbitraries
 *
 * @example
 * ```typescript
 * // Single arbitrary
 * fc.prop(fc.integer(), x => x + 0 === x).assert();
 *
 * // Multiple arbitraries
 * fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();
 *
 * // With configuration
 * fc.prop(fc.integer(), x => x > 0)
 *   .config(fc.strategy().withShrinking())
 *   .assert();
 * ```
 */
export interface FluentProperty<Args extends unknown[]> {
  /**
   * Check the property and return a result without throwing.
   *
   * @returns A `FluentResult` containing the test outcome and any counterexample found
   *
   * @example
   * ```typescript
   * const result = fc.prop(fc.integer(), x => x >= 0).check();
   * if (!result.satisfiable) {
   *   console.log('Counterexample:', result.example);
   * }
   * ```
   */
  check(): FluentResult<Record<string, unknown>>

  /**
   * Check the property and throw an error if it fails.
   *
   * @param message - Optional custom message prefix for the error
   * @throws Error if the property is not satisfiable, with a descriptive message including the counterexample
   *
   * @example
   * ```typescript
   * // Basic assertion
   * fc.prop(fc.integer(), x => x + 0 === x).assert();
   *
   * // With custom message
   * fc.prop(fc.integer(), x => x > 0).assert('Integer should be positive');
   * ```
   */
  assert(message?: string): void

  /**
   * Configure the property with a custom strategy.
   *
   * @param strategyFactory - A strategy factory to configure test execution
   * @returns A new `FluentProperty` with the configured strategy
   *
   * @example
   * ```typescript
   * fc.prop(fc.integer(), x => x > 0)
   *   .config(fc.strategy().withShrinking())
   *   .assert();
   * ```
   */
  config(strategyFactory: FluentStrategyFactory): FluentProperty<Args>
}

/**
 * Internal implementation of FluentProperty.
 */
class FluentPropertyImpl<Args extends unknown[]> implements FluentProperty<Args> {
  constructor(
    private readonly arbitraries: Arbitrary<unknown>[],
    private readonly predicate: (...args: Args) => boolean,
    private readonly strategyFactory?: FluentStrategyFactory
  ) {}

  check(): FluentResult<Record<string, unknown>> {
    let checker = new FluentCheck()

    if (this.strategyFactory !== undefined) {
      checker = checker.config(this.strategyFactory)
    }

    // Build the chain with positional argument names
    let chain: FluentCheck<Record<string, unknown>, Record<string, unknown>> =
      checker as FluentCheck<Record<string, unknown>, Record<string, unknown>>

    for (let i = 0; i < this.arbitraries.length; i++) {
      chain = chain.forall(`arg${i}`, this.arbitraries[i])
    }

    // Create the predicate wrapper that extracts positional arguments
    const wrappedPredicate = (args: Record<string, unknown>): boolean => {
      const positionalArgs = this.arbitraries.map((_, i) => args[`arg${i}`]) as Args
      return this.predicate(...positionalArgs)
    }

    return chain.then(wrappedPredicate).check()
  }

  assert(message?: string): void {
    const result = this.check()
    if (!result.satisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      // Extract positional arguments for cleaner error message
      const args = this.arbitraries.map((_, i) => result.example[`arg${i}`])
      const argsStr = args.length === 1
        ? JSON.stringify(args[0])
        : `(${args.map(a => JSON.stringify(a)).join(', ')})`
      const seedStr = result.seed !== undefined ? ` (seed: ${result.seed})` : ''
      throw new Error(`${prefix}Property failed with counterexample: ${argsStr}${seedStr}`)
    }
  }

  config(strategyFactory: FluentStrategyFactory): FluentProperty<Args> {
    return new FluentPropertyImpl(this.arbitraries, this.predicate, strategyFactory)
  }
}

// Overloads for 1-5 arbitraries

/**
 * Create a property test with a single arbitrary.
 *
 * @param arb - The arbitrary to generate test values
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 *
 * @example
 * ```typescript
 * fc.prop(fc.integer(), x => x + 0 === x).assert();
 * ```
 */
export function prop<A>(
  arb: Arbitrary<A>,
  predicate: (a: A) => boolean
): FluentProperty<[A]>

/**
 * Create a property test with two arbitraries.
 *
 * @param arb1 - First arbitrary
 * @param arb2 - Second arbitrary
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 *
 * @example
 * ```typescript
 * fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();
 * ```
 */
export function prop<A, B>(
  arb1: Arbitrary<A>,
  arb2: Arbitrary<B>,
  predicate: (a: A, b: B) => boolean
): FluentProperty<[A, B]>

/**
 * Create a property test with three arbitraries.
 *
 * @param arb1 - First arbitrary
 * @param arb2 - Second arbitrary
 * @param arb3 - Third arbitrary
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 *
 * @example
 * ```typescript
 * fc.prop(fc.integer(), fc.integer(), fc.integer(),
 *   (a, b, c) => (a + b) + c === a + (b + c)
 * ).assert();
 * ```
 */
export function prop<A, B, C>(
  arb1: Arbitrary<A>,
  arb2: Arbitrary<B>,
  arb3: Arbitrary<C>,
  predicate: (a: A, b: B, c: C) => boolean
): FluentProperty<[A, B, C]>

/**
 * Create a property test with four arbitraries.
 *
 * @param arb1 - First arbitrary
 * @param arb2 - Second arbitrary
 * @param arb3 - Third arbitrary
 * @param arb4 - Fourth arbitrary
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 */
export function prop<A, B, C, D>(
  arb1: Arbitrary<A>,
  arb2: Arbitrary<B>,
  arb3: Arbitrary<C>,
  arb4: Arbitrary<D>,
  predicate: (a: A, b: B, c: C, d: D) => boolean
): FluentProperty<[A, B, C, D]>

/**
 * Create a property test with five arbitraries.
 *
 * @param arb1 - First arbitrary
 * @param arb2 - Second arbitrary
 * @param arb3 - Third arbitrary
 * @param arb4 - Fourth arbitrary
 * @param arb5 - Fifth arbitrary
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 */
export function prop<A, B, C, D, E>(
  arb1: Arbitrary<A>,
  arb2: Arbitrary<B>,
  arb3: Arbitrary<C>,
  arb4: Arbitrary<D>,
  arb5: Arbitrary<E>,
  predicate: (a: A, b: B, c: C, d: D, e: E) => boolean
): FluentProperty<[A, B, C, D, E]>

// Implementation
export function prop(...args: unknown[]): FluentProperty<unknown[]> {
  const predicate = args[args.length - 1] as (...args: unknown[]) => boolean
  const arbitraries = args.slice(0, -1) as Arbitrary<unknown>[]
  return new FluentPropertyImpl(arbitraries, predicate)
}
