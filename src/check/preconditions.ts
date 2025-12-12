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
