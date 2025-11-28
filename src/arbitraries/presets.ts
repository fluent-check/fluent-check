/**
 * Common arbitrary presets for frequently-used patterns.
 *
 * These factory functions provide shorthand alternatives to verbose
 * arbitrary configurations, improving readability and reducing boilerplate.
 */

import type {ExactSizeArbitrary} from './types.js'
import type {Arbitrary} from './internal.js'
import {integer, array, tuple, union, constant, string as stringArb} from './index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Integer Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary that generates positive integers (>= 1).
 *
 * @returns An arbitrary generating integers in range [1, MAX_SAFE_INTEGER]
 *
 * @example
 * ```ts
 * fc.positiveInt()  // 1, 42, 999999, ...
 * ```
 */
export const positiveInt = (): ExactSizeArbitrary<number> =>
  integer(1, Number.MAX_SAFE_INTEGER)

/**
 * Creates an arbitrary that generates negative integers (<= -1).
 *
 * @returns An arbitrary generating integers in range [MIN_SAFE_INTEGER, -1]
 *
 * @example
 * ```ts
 * fc.negativeInt()  // -1, -42, -999999, ...
 * ```
 */
export const negativeInt = (): ExactSizeArbitrary<number> =>
  integer(Number.MIN_SAFE_INTEGER, -1)

/**
 * Creates an arbitrary that generates non-zero integers.
 * Can produce both positive and negative values, but never zero.
 *
 * @returns An arbitrary generating integers that are never 0
 *
 * @example
 * ```ts
 * fc.nonZeroInt()  // -42, 1, -1, 999, ...
 * ```
 */
export const nonZeroInt = (): Arbitrary<number> =>
  union(negativeInt(), positiveInt())

/**
 * Creates an arbitrary that generates byte values (0-255).
 *
 * @returns An arbitrary generating integers in range [0, 255]
 *
 * @example
 * ```ts
 * fc.byte()  // 0, 127, 255, 42, ...
 * ```
 */
export const byte = (): ExactSizeArbitrary<number> =>
  integer(0, 255)

// ─────────────────────────────────────────────────────────────────────────────
// String Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary that generates non-empty strings (length >= 1).
 *
 * @param maxLength - Maximum string length (default: 100)
 * @returns An arbitrary generating strings with length in range [1, maxLength]
 *
 * @example
 * ```ts
 * fc.nonEmptyString()      // "a", "hello", "xyz123", ...
 * fc.nonEmptyString(10)    // strings with length 1-10
 * ```
 */
export const nonEmptyString = (maxLength = 100): ExactSizeArbitrary<string> =>
  stringArb(1, maxLength)

// ─────────────────────────────────────────────────────────────────────────────
// Collection Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary that generates non-empty arrays (length >= 1).
 *
 * @param arb - Arbitrary for generating array elements
 * @param maxLength - Maximum array length (default: 10)
 * @returns An arbitrary generating arrays with length in range [1, maxLength]
 *
 * @example
 * ```ts
 * fc.nonEmptyArray(fc.integer())        // [1], [2, 3, 4], ...
 * fc.nonEmptyArray(fc.string(), 5)      // ["a"], ["x", "y"], ...
 * ```
 */
export const nonEmptyArray = <A>(arb: Arbitrary<A>, maxLength = 10): ExactSizeArbitrary<A[]> =>
  array(arb, 1, maxLength)

/**
 * Creates an arbitrary that generates 2-tuples (pairs) of the same type.
 *
 * @param arb - Arbitrary for generating both elements
 * @returns An arbitrary generating [T, T] tuples
 *
 * @example
 * ```ts
 * fc.pair(fc.integer())  // [1, 2], [42, -7], ...
 * fc.pair(fc.string())   // ["a", "b"], ["foo", "bar"], ...
 * ```
 */
export const pair = <A>(arb: Arbitrary<A>): Arbitrary<[A, A]> =>
  tuple(arb, arb) as Arbitrary<[A, A]>

// ─────────────────────────────────────────────────────────────────────────────
// Nullable/Optional Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary that generates values or null.
 *
 * @param arb - Arbitrary for generating non-null values
 * @returns An arbitrary generating values of type `T | null`
 *
 * @example
 * ```ts
 * fc.nullable(fc.integer())  // 42, null, -7, null, ...
 * fc.nullable(fc.string())   // "hello", null, "world", ...
 * ```
 */
export const nullable = <A>(arb: Arbitrary<A>): Arbitrary<A | null> =>
  union(arb, constant(null))

/**
 * Creates an arbitrary that generates values or undefined.
 *
 * @param arb - Arbitrary for generating defined values
 * @returns An arbitrary generating values of type `T | undefined`
 *
 * @example
 * ```ts
 * fc.optional(fc.integer())  // 42, undefined, -7, undefined, ...
 * fc.optional(fc.string())   // "hello", undefined, "world", ...
 * ```
 */
export const optional = <A>(arb: Arbitrary<A>): Arbitrary<A | undefined> =>
  union(arb, constant(undefined))
