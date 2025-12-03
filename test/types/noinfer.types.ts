/**
 * Type-level tests for NoInfer<T> usage in FluentCheck.
 *
 * These tests verify that type inference works as expected after applying
 * NoInfer<T> to control which parameter positions drive type inference.
 *
 * Run with: npm run test:types
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {FluentCheck} from '../../src/FluentCheck.js'
import {integer, type Arbitrary} from '../../src/arbitraries/index.js'
import {type Expect, type Equal} from './test-utils.types.js'

// ============================================================================
// Helper type to extract Rec from FluentCheck
// ============================================================================

// FluentCheck<Rec, ParentRec> where both extend {}
// We need to use a conditional type that works with the constraints
type ExtractRec<T> = T extends FluentCheck<infer R, infer _P> ? R : never

// ============================================================================
// Test: given() with factory - V inferred from return type
// ============================================================================

const factoryInference = new FluentCheck().given('x', () => 42)
type FactoryRec = ExtractRec<typeof factoryInference>

// Test: 'x' should be number (inferred from factory return)
type _T1 = Expect<Equal<FactoryRec['x'], number>>

// ============================================================================
// Test: given() with explicit type parameter
// ============================================================================

const explicitType = new FluentCheck().given<'x', number>('x', 42)
type ExplicitRec = ExtractRec<typeof explicitType>

type _T2 = Expect<Equal<ExplicitRec['x'], number>>

// ============================================================================
// Test: and() chains preserve types correctly
// ============================================================================

const chainedGiven = new FluentCheck()
  .given('a', () => 1)
  .and('b', ({a}) => String(a))

type ChainedRec = ExtractRec<typeof chainedGiven>

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

type ComposedRec = ExtractRec<typeof composed>

type _T10 = Expect<Equal<ComposedRec['n'], number>>
type _T11 = Expect<Equal<ComposedRec['doubled'], number>>
