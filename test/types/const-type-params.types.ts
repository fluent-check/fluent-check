/**
 * Type-level tests for const type parameters in oneof(), set(), and tuple().
 *
 * These tests verify that literal types are correctly inferred when using
 * const type parameters, without requiring callers to use `as const` assertions.
 *
 * Run with: npx tsc --noEmit
 *
 * If any type assertion fails, TypeScript will produce a compile error.
 */

import {oneof, set, tuple, integer, boolean, Arbitrary} from '../../src/arbitraries/index.js'

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
 * Returns `true` if T extends U, `false` otherwise.
 */
type Extends<T, U> = T extends U ? true : false

// ============================================================================
// Test: oneof() infers literal union types
// ============================================================================

// String literals should be preserved
const statusArb = oneof(['pending', 'active', 'done'])
type StatusValue = typeof statusArb extends Arbitrary<infer T> ? T : never
type _T1 = Expect<Equal<StatusValue, 'pending' | 'active' | 'done'>>

// Number literals should be preserved
const digitArb = oneof([0, 1, 2, 3])
type DigitValue = typeof digitArb extends Arbitrary<infer T> ? T : never
type _T2 = Expect<Equal<DigitValue, 0 | 1 | 2 | 3>>

// Mixed literals should be preserved
const mixedArb = oneof(['a', 1, true])
type MixedValue = typeof mixedArb extends Arbitrary<infer T> ? T : never
type _T3 = Expect<Equal<MixedValue, 'a' | 1 | true>>

// Single element should still work
const singleArb = oneof(['only'])
type SingleValue = typeof singleArb extends Arbitrary<infer T> ? T : never
type _T4 = Expect<Equal<SingleValue, 'only'>>

// ============================================================================
// Test: oneof() with variables (backward compatibility)
// ============================================================================

// When using a variable with explicit type, it should still work
const stringArray: string[] = ['a', 'b', 'c']
const stringArb = oneof(stringArray)
type StringValue = typeof stringArb extends Arbitrary<infer T> ? T : never
// With explicit string[] type, result should be string (not literals)
type _T5 = Expect<Equal<StringValue, string>>

// When using a readonly array, literals are preserved
const readonlyStrings = ['x', 'y', 'z'] as const
const readonlyArb = oneof(readonlyStrings)
type ReadonlyValue = typeof readonlyArb extends Arbitrary<infer T> ? T : never
type _T6 = Expect<Equal<ReadonlyValue, 'x' | 'y' | 'z'>>

// ============================================================================
// Test: set() infers literal array types
// ============================================================================

// String literal arrays should be preserved
const colorSetArb = set(['red', 'green', 'blue'], 1, 2)
type ColorSetValue = typeof colorSetArb extends Arbitrary<infer T> ? T : never
type _T7 = Expect<Equal<ColorSetValue, ('red' | 'green' | 'blue')[]>>

// Number literal arrays should be preserved
const numSetArb = set([1, 2, 3, 4, 5], 2, 3)
type NumSetValue = typeof numSetArb extends Arbitrary<infer T> ? T : never
type _T8 = Expect<Equal<NumSetValue, (1 | 2 | 3 | 4 | 5)[]>>

// ============================================================================
// Test: set() with variables (backward compatibility)
// ============================================================================

// When using a variable with explicit type, it should still work
const items: string[] = ['item1', 'item2']
const itemSetArb = set(items, 1, 2)
type ItemSetValue = typeof itemSetArb extends Arbitrary<infer T> ? T : never
type _T9 = Expect<Equal<ItemSetValue, string[]>>

// ============================================================================
// Test: tuple() preserves tuple structure with const
// ============================================================================

// Basic tuple inference
const pointArb = tuple(integer(0, 100), integer(0, 100))
type PointValue = typeof pointArb extends Arbitrary<infer T> ? T : never
type _T10 = Expect<Equal<PointValue, [number, number]>>

// Mixed type tuple
const mixedTupleArb = tuple(integer(0, 10), boolean())
type MixedTupleValue = typeof mixedTupleArb extends Arbitrary<infer T> ? T : never
type _T11 = Expect<Equal<MixedTupleValue, [number, boolean]>>

// Triple tuple
const tripleArb = tuple(integer(0, 5), boolean(), integer(10, 20))
type TripleValue = typeof tripleArb extends Arbitrary<infer T> ? T : never
type _T12 = Expect<Equal<TripleValue, [number, boolean, number]>>

// ============================================================================
// Test: Composing const type parameters with map()
// ============================================================================

// oneof followed by map should preserve the literal type
const uppercaseStatus = oneof(['pending', 'active', 'done']).map(s => s.toUpperCase())
type UppercaseStatusValue = typeof uppercaseStatus extends Arbitrary<infer T> ? T : never
type _T13 = Expect<Equal<UppercaseStatusValue, string>>

// set followed by map
const colorSet = set(['red', 'green', 'blue'], 1, 2).map(colors => colors.join(','))
type ColorSetMapValue = typeof colorSet extends Arbitrary<infer T> ? T : never
type _T14 = Expect<Equal<ColorSetMapValue, string>>

// tuple followed by map
const coordString = tuple(integer(0, 100), integer(0, 100)).map(([x, y]) => `(${x},${y})`)
type CoordStringValue = typeof coordString extends Arbitrary<infer T> ? T : never
type _T15 = Expect<Equal<CoordStringValue, string>>

// ============================================================================
// Test: Nested compositions
// ============================================================================

// tuple containing oneof
const taggedValueArb = tuple(
  oneof(['string', 'number', 'boolean']),
  integer(0, 100)
)
type TaggedValueType = typeof taggedValueArb extends Arbitrary<infer T> ? T : never
type _T16 = Expect<Equal<TaggedValueType, ['string' | 'number' | 'boolean', number]>>

// ============================================================================
// Test: Type narrowing with literal types
// ============================================================================

// The inferred type should allow exhaustive switch statements
function processStatus(status: 'pending' | 'active' | 'done'): number {
  switch (status) {
    case 'pending': return 0
    case 'active': return 1
    case 'done': return 2
  }
}

// This type test verifies that the arbitrary generates the correct type for use with exhaustive checks
type _T17 = Expect<Extends<StatusValue, Parameters<typeof processStatus>[0]>>

// ============================================================================
// Test: Readonly array acceptance
// ============================================================================

// Both mutable and immutable arrays should be accepted
const mutableArray = ['a', 'b']
const mutableArb = oneof(mutableArray)
// Should infer string (mutable array loses literal info without as const)
type MutableValue = typeof mutableArb extends Arbitrary<infer T> ? T : never
type _T18 = Expect<Equal<MutableValue, string>>

const immutableArray = ['a', 'b'] as const
const immutableArb = oneof(immutableArray)
// Should infer literal union (readonly preserves literals)
type ImmutableValue = typeof immutableArb extends Arbitrary<infer T> ? T : never
type _T19 = Expect<Equal<ImmutableValue, 'a' | 'b'>>

// ============================================================================
// Test: Empty array handling
// ============================================================================

// Empty array should produce never (or handle appropriately)
const emptyArb = oneof([])
type EmptyValue = typeof emptyArb extends Arbitrary<infer T> ? T : never
// Empty array element type is never
type _T20 = Expect<Equal<EmptyValue, never>>

// Suppress unused variable warnings
void statusArb
void digitArb
void mixedArb
void singleArb
void stringArb
void readonlyArb
void colorSetArb
void numSetArb
void itemSetArb
void pointArb
void mixedTupleArb
void tripleArb
void uppercaseStatus
void colorSet
void coordString
void taggedValueArb
void mutableArb
void immutableArb
void emptyArb
void processStatus
