/**
 * Property helper functions for use in property-based testing assertions.
 *
 * These helpers provide common property checks that can be used within
 * `fc.scenario().then()` clauses or `fc.prop()` predicates.
 *
 * @example
 * ```typescript
 * import * as fc from 'fluent-check';
 *
 * // Use in scenario
 * fc.scenario()
 *   .forall('arr', fc.array(fc.integer()))
 *   .then(({ arr }) => fc.props.sorted([...arr].sort((a, b) => a - b)))
 *   .check();
 *
 * // Use in prop shorthand
 * fc.prop(fc.array(fc.integer()), arr => fc.props.nonEmpty(arr) || arr.length === 0).assert();
 * ```
 *
 * @module props
 */

/**
 * Check if an array is sorted according to a comparator.
 *
 * @param arr - The array to check
 * @param comparator - Optional comparator function. Defaults to numeric ascending order.
 * @returns `true` if the array is sorted according to the comparator
 *
 * @example
 * ```typescript
 * fc.props.sorted([1, 2, 3])  // true
 * fc.props.sorted([3, 2, 1])  // false
 * fc.props.sorted([3, 2, 1], (a, b) => b - a)  // true (descending)
 * fc.props.sorted(['a', 'b', 'c'], (a, b) => a.localeCompare(b))  // true
 * ```
 */
export function sorted<T>(arr: readonly T[], comparator?: (a: T, b: T) => number): boolean {
  if (arr.length <= 1) return true

  const cmp = comparator ?? ((a: T, b: T) => (a as number) - (b as number))

  for (let i = 1; i < arr.length; i++) {
    if (cmp(arr[i - 1], arr[i]) > 0) return false
  }
  return true
}

/**
 * Check if all elements in an array are unique.
 *
 * Uses strict equality (===) for comparison. For objects, this means
 * reference equality - use with primitive values or provide your own
 * uniqueness check for objects.
 *
 * @param arr - The array to check
 * @returns `true` if all elements are unique
 *
 * @example
 * ```typescript
 * fc.props.unique([1, 2, 3])  // true
 * fc.props.unique([1, 2, 1])  // false
 * fc.props.unique([])         // true
 * ```
 */
export function unique<T>(arr: readonly T[]): boolean {
  return new Set(arr).size === arr.length
}

/**
 * Check if an array has at least one element.
 *
 * @param arr - The array to check
 * @returns `true` if the array has at least one element
 *
 * @example
 * ```typescript
 * fc.props.nonEmpty([1])   // true
 * fc.props.nonEmpty([])    // false
 * ```
 */
export function nonEmpty<T>(arr: readonly T[]): boolean {
  return arr.length > 0
}

/**
 * Check if a number is within a range (inclusive).
 *
 * @param n - The number to check
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns `true` if `min <= n <= max`
 *
 * @example
 * ```typescript
 * fc.props.inRange(5, 1, 10)   // true
 * fc.props.inRange(0, 1, 10)   // false
 * fc.props.inRange(10, 1, 10)  // true (inclusive)
 * ```
 */
export function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max
}

/**
 * Check if a string matches a regular expression pattern.
 *
 * @param s - The string to check
 * @param pattern - The regular expression pattern to match
 * @returns `true` if the string matches the pattern
 *
 * @example
 * ```typescript
 * fc.props.matches('hello', /^h/)       // true
 * fc.props.matches('hello', /^H/i)      // true (case insensitive)
 * fc.props.matches('hello', /world/)    // false
 * fc.props.matches('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)  // true
 * ```
 */
export function matches(s: string, pattern: RegExp): boolean {
  return pattern.test(s)
}

// =============================================================================
// Mathematical Property Predicates
// =============================================================================

/**
 * Default equality comparison using JSON serialization.
 * Works for primitives, arrays, and plain objects.
 */
function defaultEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Check if decode(encode(value)) === value (roundtrip property).
 *
 * @param value - The value to test
 * @param encode - Function to encode values
 * @param decode - Function to decode values back
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns `true` if the roundtrip preserves the value
 *
 * @example
 * ```typescript
 * fc.props.roundtrips([1, 2, 3], JSON.stringify, JSON.parse)  // true
 *
 * // In a scenario
 * fc.scenario()
 *   .forall('data', fc.array(fc.integer()))
 *   .then(({ data }) => fc.props.roundtrips(data, JSON.stringify, JSON.parse))
 *   .check();
 * ```
 */
export function roundtrips<A, B>(
  value: A,
  encode: (a: A) => B,
  decode: (b: B) => A,
  equals: (a: A, b: A) => boolean = defaultEquals
): boolean {
  return equals(decode(encode(value)), value)
}

/**
 * Check if fn(fn(value)) === fn(value) (idempotency property).
 *
 * @param value - The value to test
 * @param fn - Function to test for idempotency
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns `true` if applying fn twice equals applying it once
 *
 * @example
 * ```typescript
 * fc.props.isIdempotent([-5, 3], arr => [...new Set(arr)])  // true
 * fc.props.isIdempotent(-5, Math.abs)  // true
 *
 * // In a scenario
 * fc.scenario()
 *   .forall('n', fc.integer())
 *   .then(({ n }) => fc.props.isIdempotent(n, Math.abs))
 *   .check();
 * ```
 */
export function isIdempotent<T>(
  value: T,
  fn: (x: T) => T,
  equals: (a: T, b: T) => boolean = defaultEquals
): boolean {
  return equals(fn(fn(value)), fn(value))
}

/**
 * Check if fn(a, b) === fn(b, a) (commutativity property).
 *
 * @param a - First value
 * @param b - Second value
 * @param fn - Binary function to test for commutativity
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns `true` if argument order doesn't affect the result
 *
 * @example
 * ```typescript
 * fc.props.commutes(3, 5, (a, b) => a + b)  // true
 * fc.props.commutes(3, 5, (a, b) => a - b)  // false
 *
 * // In a scenario
 * fc.scenario()
 *   .forall('a', fc.integer())
 *   .forall('b', fc.integer())
 *   .then(({ a, b }) => fc.props.commutes(a, b, (x, y) => x + y))
 *   .check();
 * ```
 */
export function commutes<T, R>(
  a: T,
  b: T,
  fn: (a: T, b: T) => R,
  equals: (a: R, b: R) => boolean = defaultEquals
): boolean {
  return equals(fn(a, b), fn(b, a))
}

/**
 * Check if fn(a, fn(b, c)) === fn(fn(a, b), c) (associativity property).
 *
 * @param a - First value
 * @param b - Second value
 * @param c - Third value
 * @param fn - Binary function to test for associativity
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns `true` if grouping doesn't affect the result
 *
 * @example
 * ```typescript
 * fc.props.associates(1, 2, 3, (a, b) => a + b)  // true
 * fc.props.associates('a', 'b', 'c', (a, b) => a + b)  // true
 *
 * // In a scenario
 * fc.scenario()
 *   .forall('a', fc.integer())
 *   .forall('b', fc.integer())
 *   .forall('c', fc.integer())
 *   .then(({ a, b, c }) => fc.props.associates(a, b, c, (x, y) => x + y))
 *   .check();
 * ```
 */
export function associates<T>(
  a: T,
  b: T,
  c: T,
  fn: (a: T, b: T) => T,
  equals: (a: T, b: T) => boolean = defaultEquals
): boolean {
  return equals(fn(a, fn(b, c)), fn(fn(a, b), c))
}

/**
 * Check if fn(value, identity) === value && fn(identity, value) === value (identity property).
 *
 * @param value - The value to test
 * @param fn - Binary function to test
 * @param identity - The identity element
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns `true` if identity element behaves correctly
 *
 * @example
 * ```typescript
 * fc.props.hasIdentity(5, (a, b) => a + b, 0)  // true (0 is identity for +)
 * fc.props.hasIdentity(5, (a, b) => a * b, 1)  // true (1 is identity for *)
 *
 * // In a scenario
 * fc.scenario()
 *   .forall('n', fc.integer())
 *   .then(({ n }) => fc.props.hasIdentity(n, (a, b) => a + b, 0))
 *   .check();
 * ```
 */
export function hasIdentity<T>(
  value: T,
  fn: (a: T, b: T) => T,
  identity: T,
  equals: (a: T, b: T) => boolean = defaultEquals
): boolean {
  return equals(fn(value, identity), value) && equals(fn(identity, value), value)
}

/**
 * Namespace containing all property helper functions.
 */
export const props = {
  // Simple property checks
  sorted,
  unique,
  nonEmpty,
  inRange,
  matches,
  // Mathematical property predicates (composable)
  roundtrips,
  isIdempotent,
  commutes,
  associates,
  hasIdentity
}
