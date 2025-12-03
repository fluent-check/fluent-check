/**
 * Type-level tests for fc.prop() shorthand API.
 *
 * These tests verify that type inference works correctly for all overloads
 * of the prop() function and that the FluentProperty interface is correctly typed.
 *
 * Run with: npm run test:types
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {prop, type FluentProperty} from '../../src/FluentProperty.js'
import {integer, string, boolean, array} from '../../src/arbitraries/index.js'
import {type Expect, type Equal} from './test-utils.types.js'

// ============================================================================
// Test: Single arbitrary - predicate receives correct type
// ============================================================================

const singleArb = prop(integer(0, 100), x => x >= 0)
type _T1 = Expect<Equal<typeof singleArb, FluentProperty<[number]>>>

// Verify predicate parameter type is inferred correctly (should compile)
prop(integer(), (x: number) => x + 0 === x)
prop(string(), (s: string) => s.length >= 0)
prop(boolean(), (b: boolean) => b === true || b === false)

// ============================================================================
// Test: Two arbitraries - predicate receives correct types
// ============================================================================

const twoArbs = prop(integer(), string(), (n, s) => String(n).length <= s.length || true)
type _T2 = Expect<Equal<typeof twoArbs, FluentProperty<[number, string]>>>

// Verify predicate parameter types are inferred correctly
prop(integer(), boolean(), (a: number, b: boolean) => a > 0 || b)

// ============================================================================
// Test: Three arbitraries - predicate receives correct types
// ============================================================================

const threeArbs = prop(
  integer(),
  string(),
  boolean(),
  (n, s, b) => (b ? n.toString() : s).length >= 0
)
type _T3 = Expect<Equal<typeof threeArbs, FluentProperty<[number, string, boolean]>>>

// ============================================================================
// Test: Four arbitraries - predicate receives correct types
// ============================================================================

const fourArbs = prop(
  integer(),
  string(),
  boolean(),
  array(integer(), 0, 5),
  (n, s, b, arr) => arr.includes(n) || !b || s.length >= 0
)
type _T4 = Expect<Equal<typeof fourArbs, FluentProperty<[number, string, boolean, number[]]>>>

// ============================================================================
// Test: Five arbitraries - predicate receives correct types
// ============================================================================

const fiveArbs = prop(
  integer(0, 10),
  integer(0, 10),
  integer(0, 10),
  integer(0, 10),
  integer(0, 10),
  (a, b, c, d, e) => a + b + c + d + e >= 0
)
type _T5 = Expect<Equal<typeof fiveArbs, FluentProperty<[number, number, number, number, number]>>>

// ============================================================================
// Test: config() returns FluentProperty with same type parameter
// ============================================================================

import {strategy} from '../../src/index.js'

const configured = prop(integer(), x => x >= 0).config(strategy())
type _T6 = Expect<Equal<typeof configured, FluentProperty<[number]>>>

// Chained config
const chainedConfig = prop(integer(), string(), (n, s) => true)
  .config(strategy())
type _T7 = Expect<Equal<typeof chainedConfig, FluentProperty<[number, string]>>>

// ============================================================================
// Test: check() returns FluentResult
// ============================================================================

import {type FluentResult} from '../../src/FluentCheck.js'

const checkResult = prop(integer(), x => x >= 0).check()
type _T8 = Expect<Equal<typeof checkResult, FluentResult<Record<string, unknown>>>>

// ============================================================================
// Test: assert() returns void
// ============================================================================

const assertResult = prop(integer(), x => x + 0 === x).assert()
type _T9 = Expect<Equal<typeof assertResult, void>>

// ============================================================================
// Test: Predicate with explicit return type
// ============================================================================

// Predicate must return boolean
prop(integer(), (x): boolean => x >= 0)

// ============================================================================
// Test: @ts-expect-error - verify type errors are caught
// ============================================================================

// @ts-expect-error: Predicate should receive number, not string
prop(integer(), (x: string) => x.length > 0)

// @ts-expect-error: Predicate should receive (number, string), not (string, number)
prop(integer(), string(), (a: string, b: number) => true)
