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
  ArbitrarySize,
  ExactSize,
  EstimatedSize,
  exactSize,
  estimatedSize,
  integer,
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
// Test: size() method returns ArbitrarySize (union)
// ============================================================================

const integerSize = integer(0, 100).size()
type _T11 = Expect<Equal<typeof integerSize, ExactSize>>

// Filtered arbitrary should return EstimatedSize
const filteredSize = integer(0, 100).filter(n => n > 50).size()
type _T12 = Expect<Equal<typeof filteredSize, EstimatedSize>>

// Mapped arbitrary preserves the underlying type
const mappedSize = integer(0, 100).map(n => n * 2).size()
// MappedArbitrary delegates to base, so it returns ArbitrarySize (could be either)
type _T13 = Expect<Equal<typeof mappedSize, ArbitrarySize>>

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
