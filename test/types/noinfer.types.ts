/**
 * Type-level tests for NoInfer<T> usage in FluentCheck.
 *
 * These tests verify that type inference works as expected after applying
 * NoInfer<T> to control which parameter positions drive type inference.
 *
 * Run with: npx tsc --noEmit
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {FluentCheck} from '../../src/FluentCheck.js'
import {integer, Arbitrary} from '../../src/arbitraries/index.js'

// ============================================================================
// Type assertion utilities (standard type-testing pattern)
// ============================================================================

/**
 * Requires T to be `true`. If T is `false`, this causes a compile error.
 */
type Expect<T extends true> = T

/**
 * Returns `true` if X and Y are exactly equal types, `false` otherwise.
 * Uses the distributive conditional type trick for exact equality.
 */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false

// ============================================================================
// Test: given() with factory - V inferred from return type
// ============================================================================

const factoryInference = new FluentCheck().given('x', () => 42)
// Extract the Rec type from FluentCheck<Rec, ParentRec>
type FactoryRec = typeof factoryInference extends FluentCheck<infer R, unknown> ? R : never

// Test: 'x' should be number (inferred from factory return)
type _T1 = Expect<Equal<FactoryRec['x'], number>>

// ============================================================================
// Test: given() with explicit type parameter
// ============================================================================

const explicitType = new FluentCheck().given<'x', number>('x', 42)
type ExplicitRec = typeof explicitType extends FluentCheck<infer R, unknown> ? R : never

type _T2 = Expect<Equal<ExplicitRec['x'], number>>

// ============================================================================
// Test: and() chains preserve types correctly
// ============================================================================

const chainedGiven = new FluentCheck()
  .given('a', () => 1)
  .and('b', ({a}) => String(a))

type ChainedRec = typeof chainedGiven extends FluentCheck<infer R, unknown> ? R : never

// Both 'a' and 'b' should have correct types
type _T3 = Expect<Equal<ChainedRec['a'], number>>
type _T4 = Expect<Equal<ChainedRec['b'], string>>

// ============================================================================
// Test: map() - B inferred from transformation function f
// ============================================================================

const mapToString = integer(0, 100).map(n => String(n))
type _T5 = Expect<Equal<typeof mapToString, Arbitrary<string>>>

const mapToBool = integer(0, 100).map(n => n > 50)
type _T6 = Expect<Equal<typeof mapToBool, Arbitrary<boolean>>>

const mapToTuple = integer(0, 10).map(n => [n, n * 2] as const)
type _T7 = Expect<Equal<typeof mapToTuple, Arbitrary<readonly [number, number]>>>

// ============================================================================
// Test: map() with shrinkHelper - B still from f, NOT from helper
// ============================================================================

// With inverseMap: B should be boolean (from n > 50), not inferred from inverseMap
const mapWithInverse = integer(0, 100).map(
  n => n > 50,
  {inverseMap: b => b ? [75] : [25]}
)
type _T8 = Expect<Equal<typeof mapWithInverse, Arbitrary<boolean>>>

// With canGenerate: B should be number (from Math.abs), not from canGenerate
const mapWithCanGenerate = integer(-100, 100).map(
  n => Math.abs(n),
  {canGenerate: pick => pick.value >= 0}
)
type _T9 = Expect<Equal<typeof mapWithCanGenerate, Arbitrary<number>>>

// ============================================================================
// Test: forall + given composition
// ============================================================================

const composed = new FluentCheck()
  .forall('n', integer(0, 10))
  .given('doubled', ({n}) => n * 2)

type ComposedRec = typeof composed extends FluentCheck<infer R, unknown> ? R : never

type _T10 = Expect<Equal<ComposedRec['n'], number>>
type _T11 = Expect<Equal<ComposedRec['doubled'], number>>

// ============================================================================
// Test: @ts-expect-error - verify type errors are caught
// ============================================================================

// This tests that shrinkHelper's inverseMap must return A[] (the source type),
// NOT B[] (the mapped type). If NoInfer is working correctly, this should error.

// @ts-expect-error: inverseMap returns string[] but should return number[]
integer(0, 100).map(
  n => String(n),
  {inverseMap: (_b: string) => ['not', 'numbers']}
)

// @ts-expect-error: Comparing string with > operator on number
integer(0, 100).map(
  n => String(n),
  {canGenerate: pick => pick.value > 0}
)
