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
