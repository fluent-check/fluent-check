# Change: Use `const` Type Parameters for Literal Inference

> **GitHub Issue:** [#376](https://github.com/fluent-check/fluent-check/issues/376)

## Why

Functions accepting arrays or tuples often lose literal type information without `as const` assertions from callers. TypeScript 5.0 introduced `const` type parameters that automatically infer literal types, improving type precision without requiring caller-side changes.

This is particularly impactful for property-based testing libraries where precise types enable:
- Better downstream type inference in `map()`, `filter()`, and `chain()` operations
- More accurate IDE autocomplete and error messages
- Stricter type checking that catches bugs at compile time

## What Changes

- Add `const` modifier to type parameters in functions accepting literal arrays
- Primary targets in `src/arbitraries/index.ts`:
  - `oneof()` - **highest impact**: transforms `Arbitrary<string>` → `Arbitrary<'a' | 'b' | 'c'>`
  - `tuple()` - preserves exact tuple types in arbitrary composition
  - `set()` - preserves literal element types for subset generation
- Secondary targets in `src/arbitraries/regex.ts`:
  - Local `oneof()` and `tuple()` implementations (internal, for consistency)
- No runtime behavior changes

## Impact

- Affected specs: None (type-level improvement)
- Affected code: `src/arbitraries/index.ts`, `src/arbitraries/regex.ts`
- Breaking: None (strictly additive type improvement)
- TypeScript requirement: 5.0+ (project uses 5.9.3 ✓)

## Examples

### `oneof()` - Highest Impact

**Before:**
```typescript
export const oneof = <A>(elements: A[]): Arbitrary<A> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

// Usage:
const status = oneof(['pending', 'active', 'done'])
// Type: Arbitrary<string>  ❌ Loses literal information
```

**After:**
```typescript
export const oneof = <const A extends readonly unknown[]>(elements: A): Arbitrary<A[number]> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

// Usage:
const status = oneof(['pending', 'active', 'done'])
// Type: Arbitrary<'pending' | 'active' | 'done'>  ✅ Preserves literals as union
```

**Downstream benefit:**
```typescript
// Before: value is string, requires type assertion
status.map(s => s.toUpperCase())  // s: string

// After: value is union type, enables exhaustive checking
status.map(s => {
  switch (s) {
    case 'pending': return 0
    case 'active': return 1
    case 'done': return 2
    // TypeScript knows this is exhaustive!
  }
})
```

### `tuple()` - Preserves Tuple Structure

**Before:**
```typescript
export const tuple = <U extends Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> =>
  // ...

// Usage:
const point = tuple(integer(0, 100), integer(0, 100))
// Type inference works but tuple length isn't strictly enforced in all contexts
```

**After:**
```typescript
export const tuple = <const U extends readonly Arbitrary<any>[]>(
  ...arbitraries: U
): Arbitrary<UnwrapFluentPick<U>> =>
  // ...

// Usage: Same behavior, but stricter inference in complex scenarios
```

### `set()` - Preserves Element Literals

**Before:**
```typescript
export const set = <A>(elements: A[], min = 0, max = 10): Arbitrary<A[]> =>
  // ...

// Usage:
const tags = set(['red', 'green', 'blue'], 1, 2)
// Type: Arbitrary<string[]>  ❌
```

**After:**
```typescript
export const set = <const A extends readonly unknown[]>(
  elements: A,
  min = 0,
  max = 10
): Arbitrary<A[number][]> =>
  // ...

// Usage:
const tags = set(['red', 'green', 'blue'], 1, 2)
// Type: Arbitrary<('red' | 'green' | 'blue')[]>  ✅
```

## Benefits Summary

| Function | Before | After |
|----------|--------|-------|
| `oneof(['a', 'b'])` | `Arbitrary<string>` | `Arbitrary<'a' \| 'b'>` |
| `set(['x', 'y'], 1, 2)` | `Arbitrary<string[]>` | `Arbitrary<('x' \| 'y')[]>` |
| `tuple(int, str)` | Works | Stricter tuple inference |

## Compatibility Notes

- Callers passing variables (not literals) continue to work as before
- Existing code with explicit type annotations remains valid
- The `readonly` modifier in the constraint allows both mutable and immutable arrays
