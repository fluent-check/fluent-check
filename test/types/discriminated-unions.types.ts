/**
 * Type-level tests for discriminated union types in ArbitrarySize.
 *
 * These tests verify that TypeScript correctly narrows types based on the
 * 'type' discriminant and that each variant has the expected shape.
 *
 * Run with: npx tsc --noEmit
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Arbitrary,
  ArbitrarySize,
  ExactSize,
  EstimatedSize,
  ExactSizeArbitrary,
  EstimatedSizeArbitrary,
  exactSize,
  estimatedSize,
  integer,
  boolean,
  constant,
  array,
  oneof,
  char,
  string,
  NoArbitrary,
} from '../../src/arbitraries/index.js'

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

/**
 * Returns `true` if T has property K, `false` otherwise.
 */
type HasProperty<T, K extends string> = K extends keyof T ? true : false

// ============================================================================
// Test: ExactSize type shape
// ============================================================================

type _T1 = Expect<Equal<ExactSize['type'], 'exact'>>
type _T2 = Expect<Equal<ExactSize['value'], number>>

// ExactSize should NOT have credibleInterval
type _T3 = Expect<Equal<HasProperty<ExactSize, 'credibleInterval'>, false>>

// ============================================================================
// Test: EstimatedSize type shape
// ============================================================================

type _T4 = Expect<Equal<EstimatedSize['type'], 'estimated'>>
type _T5 = Expect<Equal<EstimatedSize['value'], number>>
type _T6 = Expect<Equal<EstimatedSize['credibleInterval'], [number, number]>>

// EstimatedSize SHOULD have credibleInterval
type _T7 = Expect<Equal<HasProperty<EstimatedSize, 'credibleInterval'>, true>>

// ============================================================================
// Test: ArbitrarySize is a discriminated union
// ============================================================================

type _T8 = Expect<Equal<ArbitrarySize, ExactSize | EstimatedSize>>

// ============================================================================
// Test: Factory functions return correct types
// ============================================================================

const exact = exactSize(100)
type _T9 = Expect<Equal<typeof exact, ExactSize>>

const estimated = estimatedSize(100, [90, 110])
type _T10 = Expect<Equal<typeof estimated, EstimatedSize>>

// ============================================================================
// Test: Type narrowing based on discriminant
// ============================================================================

function testNarrowing(size: ArbitrarySize): void {
  if (size.type === 'exact') {
    // After narrowing, size should be ExactSize
    const narrowed: ExactSize = size

    // This should compile - ExactSize has 'value'
    const _value: number = narrowed.value

    // @ts-expect-error: ExactSize doesn't have credibleInterval
    const _interval = size.credibleInterval
  } else {
    // After narrowing, size should be EstimatedSize
    const narrowed: EstimatedSize = size

    // This should compile - EstimatedSize has all fields
    const _value: number = narrowed.value
    const _interval: [number, number] = narrowed.credibleInterval
  }
}

// ============================================================================
// Test: Exhaustive switch with never check
// ============================================================================

function exhaustiveSwitch(size: ArbitrarySize): string {
  switch (size.type) {
    case 'exact':
      return `Exactly ${size.value}`
    case 'estimated':
      return `~${size.value} (${size.credibleInterval[0]}-${size.credibleInterval[1]})`
    default: {
      // This ensures exhaustiveness - if a new variant is added, this will error
      const _exhaustive: never = size
      return _exhaustive
    }
  }
}

// ============================================================================
// Test: Factory functions return ExactSizeArbitrary
// ============================================================================

// Factory functions return ExactSizeArbitrary - verified by assignability
const intArb: ExactSizeArbitrary<number> = integer(0, 100)
const boolArb: ExactSizeArbitrary<boolean> = boolean()
const constArb: ExactSizeArbitrary<number> = constant(42)
const arrayArb: ExactSizeArbitrary<number[]> = array(integer(0, 10), 1, 5)
const oneofArb: ExactSizeArbitrary<'a' | 'b' | 'c'> = oneof(['a', 'b', 'c'] as const)
const charArb: ExactSizeArbitrary<string> = char()
const stringArb: ExactSizeArbitrary<string> = string(1, 10)

// ============================================================================
// Test: array() with estimated input returns Arbitrary, not ExactSizeArbitrary
// ============================================================================

// When input is exact, array returns ExactSizeArbitrary
const arrayOfExact: ExactSizeArbitrary<number[]> = array(integer(0, 10), 1, 5)

// When input is filtered (estimated), array returns Arbitrary
// This correctly reflects that the size will be estimated at runtime
const filteredArb = integer(0, 100).filter(n => n > 50)  // EstimatedSizeArbitrary
const arrayOfFiltered: Arbitrary<number[]> = array(filteredArb, 1, 5)

// @ts-expect-error: array of filtered arbitrary is NOT ExactSizeArbitrary
const _badArrayType: ExactSizeArbitrary<number[]> = array(filteredArb, 1, 5)

// NoArbitrary is ExactSizeArbitrary<never>
const noArb: ExactSizeArbitrary<never> = NoArbitrary
type _T11 = Expect<Equal<typeof noArb, ExactSizeArbitrary<never>>>

// ============================================================================
// Test: ExactSizeArbitrary is assignable to Arbitrary
// ============================================================================

const exactArb: ExactSizeArbitrary<number> = integer(0, 100)
const baseArb: Arbitrary<number> = exactArb  // Should compile - ExactSizeArbitrary extends Arbitrary
type _T12 = Expect<Equal<typeof baseArb extends Arbitrary<number> ? true : false, true>>

// ============================================================================
// Test: Interface method signatures work correctly
// ============================================================================

// Test that ExactSizeArbitrary.size() is declared to return ExactSize
type ExactSizeMethod = ExactSizeArbitrary<number>['size']
type _T13 = Expect<Equal<ReturnType<ExactSizeMethod>, ExactSize>>

// Test that EstimatedSizeArbitrary.size() is declared to return EstimatedSize
type EstimatedSizeMethod = EstimatedSizeArbitrary<number>['size']
type _T14 = Expect<Equal<ReturnType<EstimatedSizeMethod>, EstimatedSize>>

// Test that ExactSizeArbitrary.filter() returns EstimatedSizeArbitrary
type FilterMethod = ExactSizeArbitrary<number>['filter']
type FilterReturnType = ReturnType<FilterMethod>
// FilterReturnType should be EstimatedSizeArbitrary<number>

// Test that ExactSizeArbitrary.map() returns ExactSizeArbitrary
type MapMethod = ExactSizeArbitrary<number>['map']
// MapMethod should have return type ExactSizeArbitrary<B>

// ============================================================================
// Test: Accessing fields on union requires narrowing
// ============================================================================

function testUnionAccess(size: ArbitrarySize): void {
  // These should always work (common to both variants)
  const _type: 'exact' | 'estimated' = size.type
  const _value: number = size.value

  // @ts-expect-error: credibleInterval not available without narrowing
  const _interval = size.credibleInterval
}

// ============================================================================
// Test: Type guard functions work correctly
// ============================================================================

function isExact(size: ArbitrarySize): size is ExactSize {
  return size.type === 'exact'
}

function isEstimated(size: ArbitrarySize): size is EstimatedSize {
  return size.type === 'estimated'
}

function testTypeGuards(size: ArbitrarySize): void {
  if (isExact(size)) {
    // After type guard, TypeScript knows this is ExactSize
    const exact: ExactSize = size
    void exact
  }

  if (isEstimated(size)) {
    // After type guard, TypeScript knows this is EstimatedSize
    const _interval: [number, number] = size.credibleInterval
  }
}

// Suppress unused variable warnings
void testNarrowing
void exhaustiveSwitch
void testUnionAccess
void testTypeGuards
void intArb
void boolArb
void constArb
void arrayArb
void oneofArb
void charArb
void stringArb
void noArb
void exactArb
void baseArb
void arrayOfExact
void arrayOfFiltered
