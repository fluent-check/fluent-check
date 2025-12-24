import equal from 'fast-deep-equal'
import type {FluentStatistics} from './statistics.js'

export class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly statistics: FluentStatistics,
    public readonly seed?: number,
    public skipped = 0) { }

  addExample<A>(name: string, value: A) {
    (this.example as Record<string, A>)[name] = value
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
   * **Precondition:** The result must be satisfiable (i.e., `satisfiable === true`).
   * For non-satisfiable results, use `assertCounterExample` instead.
   *
   * @param expected - Partial object to match against the example
   * @param message - Optional custom message prefix for the error
   * @throws Error if the result is not satisfiable
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
   * result.assertExample({ a: 0 });  // Partial match (also checks satisfiability)
   * ```
   */
  assertExample(expected: Partial<Rec>, message?: string): void {
    this.#assertExampleMatch(
      expected,
      message,
      true,
      'Expected result to be satisfiable to assert example, but result is not satisfiable',
      'Example mismatch'
    )
  }

  /**
   * Assert that the found counterexample matches the expected partial object.
   * Performs a partial match: only the keys present in `expected` are compared.
   * 
   * **Precondition:** The result must not be satisfiable (i.e., `satisfiable === false`).
   * For satisfiable results, use `assertExample` instead.
   *
   * @param expected - Partial object to match against the counterexample
   * @param message - Optional custom message prefix for the error
   * @throws Error if the result is satisfiable
   * @throws Error if any property in `expected` does not match the counterexample
   *
   * @example
   * ```typescript
   * const result = fc.scenario()
   *   .forall('x', fc.integer(1, 10))
   *   .then(({ x }) => x < 0)  // Always false for positive integers
   *   .check();
   *
   * result.assertCounterExample({ x: 1 });  // Partial match (also checks non-satisfiability)
   * ```
   */
  assertCounterExample(expected: Partial<Rec>, message?: string): void {
    this.#assertExampleMatch(
      expected,
      message,
      false,
      'Expected result to NOT be satisfiable to assert counterexample, but result is satisfiable',
      'Counterexample mismatch'
    )
  }

  /**
   * Internal helper to assert that the example/counterexample matches expected values.
   * 
   * @param expected - Partial object to match against
   * @param message - Optional custom message prefix
   * @param requireSatisfiable - Whether the result must be satisfiable (true) or not satisfiable (false)
   * @param preconditionError - Error message if precondition fails
   * @param mismatchErrorPrefix - Prefix for mismatch error message
   */
  #assertExampleMatch(
    expected: Partial<Rec>,
    message: string | undefined,
    requireSatisfiable: boolean,
    preconditionError: string,
    mismatchErrorPrefix: string
  ): void {
    if (this.satisfiable !== requireSatisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const seedStr = this.seed !== undefined ? ` (seed: ${this.seed})` : ''
      throw new Error(`${prefix}${preconditionError}${seedStr}`)
    }

    const mismatches: string[] = []

    for (const key of Object.keys(expected) as Array<keyof Rec>) {
      const expectedValue = expected[key]
      const actualValue = this.example[key]

      if (!equal(expectedValue, actualValue)) {
        mismatches.push(`${String(key)}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
      }
    }

    if (mismatches.length > 0) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const seedStr = this.seed !== undefined ? ` (seed: ${this.seed})` : ''
      throw new Error(`${prefix}${mismatchErrorPrefix} - ${mismatches.join('; ')}${seedStr}`)
    }
  }
}
