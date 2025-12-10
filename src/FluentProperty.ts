import {type Arbitrary} from './arbitraries/index.js'
import {FluentCheck, type FluentResult} from './FluentCheck.js'
import {type FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'

type TupleIndices<Args extends readonly unknown[]> = Exclude<keyof Args, keyof []>

type PropRecord<Args extends readonly unknown[]> = {
  [I in TupleIndices<Args> as `arg${Extract<I, number>}`]: Args[I]
}

export type PropExample<Args extends readonly unknown[]> = PropRecord<Args>

type ArbitraryArgs<Arbs extends readonly Arbitrary<any>[]> = {
  [K in keyof Arbs]: Arbs[K] extends Arbitrary<infer A> ? A : never
}

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
export interface FluentProperty<Args extends readonly unknown[]> {
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
  check(): FluentResult<PropRecord<Args>>

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
class FluentPropertyImpl<const Args extends unknown[]> implements FluentProperty<Args> {
  readonly #arbitraries: { [I in keyof Args]: Arbitrary<Args[I]> }
  readonly #predicate: (...args: Args) => boolean
  readonly #strategyFactory?: FluentStrategyFactory<PropRecord<Args>>
  readonly #argNames: readonly string[]

  constructor(
    arbitraries: { [I in keyof Args]: Arbitrary<Args[I]> },
    predicate: (...args: Args) => boolean,
    strategyFactory?: FluentStrategyFactory<PropRecord<Args>>
  ) {
    this.#arbitraries = arbitraries
    this.#predicate = predicate
    this.#argNames = this.#arbitraries.map((_, i) => `arg${i}`)
    if (strategyFactory !== undefined) {
      this.#strategyFactory = strategyFactory
    }
  }

  check(): FluentResult<PropRecord<Args>> {
    const checker = this.#createBaseCheck()

    // Build the chain with positional argument names
    let chain: FluentCheck<any, any> = checker as any
    this.#arbitraries.forEach((arbitrary, index) => {
      if (arbitrary === undefined) return
      const name = this.#argNames[index] ?? `arg${index}`
      chain = chain.forall(name, arbitrary) as typeof chain
    })

    // Create the predicate wrapper that extracts positional arguments
    const wrappedPredicate = (args: Record<string, unknown>): boolean => {
      const positionalArgs = this.#argNames.map(name => args[name]) as Args
      return this.#predicate(...positionalArgs)
    }

    return (chain as FluentCheck<PropRecord<Args>>).then(wrappedPredicate).check() as FluentResult<PropRecord<Args>>
  }

  assert(message?: string): void {
    const result = this.check()
    if (!result.satisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const argsStr = this.#formatArgs(result.example as Record<string, unknown>)
      const seedStr = result.seed !== undefined ? ` (seed: ${result.seed})` : ''
      throw new Error(`${prefix}Property failed with counterexample: ${argsStr}${seedStr}`)
    }
  }

  config(strategyFactory: FluentStrategyFactory<PropRecord<Args>>): FluentProperty<Args> {
    return new FluentPropertyImpl(this.#arbitraries, this.#predicate, strategyFactory)
  }

  #createBaseCheck(): FluentCheck<PropRecord<Args>> {
    if (this.#strategyFactory === undefined) {
      return new FluentCheck<PropRecord<Args>>()
    }
    return new FluentCheck<PropRecord<Args>>().config(this.#strategyFactory)
  }

  #formatArgs(example: Record<string, unknown>): string {
    const args = this.#argNames.map(name => example[name])
    if (args.length === 1) return JSON.stringify(args[0])
    return `(${args.map(a => JSON.stringify(a)).join(', ')})`
  }
}

/**
 * Create a property test with one or more arbitraries.
 *
 * @param arbs - The arbitraries to generate test values
 * @param predicate - A function that returns true if the property holds
 * @returns A `FluentProperty` that can be checked or asserted
 *
 * @example
 * ```typescript
 * fc.prop(fc.integer(), x => x + 0 === x).assert();
 * fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();
 * ```
 */
export function prop<
  const Arbs extends readonly [Arbitrary<unknown>, ...Arbitrary<unknown>[]],
  const Args extends ArbitraryArgs<Arbs> = ArbitraryArgs<Arbs>
>(...args: [...arbs: Arbs, predicate: (...args: Args) => boolean]): FluentProperty<Args>

// Implementation
export function prop<Args extends unknown[]>(
  ...args: [...{ [I in keyof Args]: Arbitrary<Args[I]> }, (...args: Args) => boolean]
): FluentProperty<Args> {
  const predicate = args[args.length - 1] as (...a: Args) => boolean
  const arbitraries = args.slice(0, -1) as { [I in keyof Args]: Arbitrary<Args[I]> }
  return new FluentPropertyImpl<Args>(arbitraries, predicate)
}
