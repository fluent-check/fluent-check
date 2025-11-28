/**
 * Shared type assertion utilities for type-level tests.
 *
 * These utilities enable compile-time type testing using TypeScript's type system.
 * If any type assertion fails, TypeScript will produce a compile error.
 *
 * Run all type tests with: npm run test:types
 */

// ============================================================================
// Core Type Assertion Utilities
// ============================================================================

/**
 * Requires T to be `true`. If T is `false`, this causes a compile error.
 *
 * @example
 * type _T1 = Expect<Equal<number, number>>  // OK
 * type _T2 = Expect<Equal<number, string>>  // Compile error
 */
export type Expect<T extends true> = T

/**
 * Returns `true` if X and Y are exactly equal types, `false` otherwise.
 * Uses the distributive conditional type trick for exact equality.
 *
 * @example
 * type _T1 = Equal<number, number>     // true
 * type _T2 = Equal<number, string>     // false
 * type _T3 = Equal<1 | 2, 2 | 1>       // true
 * type _T4 = Equal<any, unknown>       // false
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false

/**
 * Returns `true` if X and Y are NOT equal types, `false` otherwise.
 *
 * @example
 * type _T1 = NotEqual<number, string>  // true
 * type _T2 = NotEqual<number, number>  // false
 */
export type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true

/**
 * Returns `true` if T extends U, `false` otherwise.
 *
 * @example
 * type _T1 = Extends<'a', string>      // true
 * type _T2 = Extends<string, 'a'>      // false
 * type _T3 = Extends<1, number>        // true
 */
export type Extends<T, U> = T extends U ? true : false

/**
 * Returns `true` if T has property K, `false` otherwise.
 *
 * @example
 * type _T1 = HasProperty<{a: number}, 'a'>  // true
 * type _T2 = HasProperty<{a: number}, 'b'>  // false
 */
export type HasProperty<T, K extends string> = K extends keyof T ? true : false

// ============================================================================
// Additional Utility Types
// ============================================================================

/**
 * Returns `true` if T is `any`, `false` otherwise.
 *
 * @example
 * type _T1 = IsAny<any>     // true
 * type _T2 = IsAny<unknown> // false
 * type _T3 = IsAny<never>   // false
 */
export type IsAny<T> = 0 extends (1 & T) ? true : false

/**
 * Returns `true` if T is `never`, `false` otherwise.
 *
 * @example
 * type _T1 = IsNever<never>   // true
 * type _T2 = IsNever<unknown> // false
 */
export type IsNever<T> = [T] extends [never] ? true : false

/**
 * Returns `true` if T is `unknown`, `false` otherwise.
 *
 * @example
 * type _T1 = IsUnknown<unknown> // true
 * type _T2 = IsUnknown<any>     // false
 */
export type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
    ? true
    : false
