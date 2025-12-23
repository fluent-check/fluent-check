# Change: Refactor Arbitrary Return Types for Type Precision

> **GitHub Issue:** [#437](https://github.com/fluent-check/fluent-check/issues/437)

## Why

Factory functions return `Arbitrary<A>` instead of more specific types, losing valuable type information. This undermines the discriminated union pattern we introduced for `ArbitrarySize`.

### Example 1: Unnecessary Type Narrowing

```typescript
// ❌ Current: Must narrow even though integer() always returns ExactSize
const size = fc.integer(0, 100).size()  // type: ArbitrarySize

// Forced to check at runtime what we know at compile time
if (size.type === 'exact') {
  console.log(`Exactly ${size.value} possibilities`)
} else {
  // Dead code - integer() never returns EstimatedSize
  console.log(`~${size.value} (${size.credibleInterval})`)
}

// ✅ After: Type system knows the truth
const size = fc.integer(0, 100).size()  // type: ExactSize
console.log(`Exactly ${size.value} possibilities`)  // Just works
```

### Example 2: Type-Safe Branching on Filtered vs Unfiltered

```typescript
// ✅ After: filter() explicitly returns EstimatedSizeArbitrary
function logSize(arb: Arbitrary<number>) {
  const size = arb.size()
  
  // Type narrowing is meaningful - reflects actual uncertainty
  if (size.type === 'estimated') {
    console.log(`~${size.value} values (${size.credibleInterval[0]}-${size.credibleInterval[1]})`)
  } else {
    console.log(`Exactly ${size.value} values`)
  }
}

const exact = fc.integer(0, 100)           // ExactSizeArbitrary<number>
const filtered = exact.filter(n => n > 50) // EstimatedSizeArbitrary<number>

// The type change from exact → estimated is visible in the type system
```

### Example 3: Composing Size-Aware Utilities

```typescript
// ✅ After: Can write utilities that depend on size precision
function exhaustiveTest<A>(arb: ExactSizeArbitrary<A>, prop: (a: A) => boolean) {
  const size = arb.size()  // type: ExactSize
  
  if (size.value <= 1000) {
    // Safe to enumerate all values - we know the exact count
    return arb.sampleUnique(size.value).every(pick => prop(pick.value))
  }
  return null  // Too large for exhaustive testing
}

// Works - integer returns ExactSizeArbitrary
exhaustiveTest(fc.integer(0, 10), n => n >= 0)

// ❌ Type error - filtered arbitrary can't guarantee exhaustive enumeration
exhaustiveTest(fc.integer(0, 100).filter(n => n % 2 === 0), n => n >= 0)
```

## What Changes

1. **Add interfaces** extending `Arbitrary<A>` with specific `size()` return types:
   - `ExactSizeArbitrary<A>` → `size(): ExactSize`
   - `EstimatedSizeArbitrary<A>` → `size(): EstimatedSize`

2. **Update factory return types**:
   - `integer()`, `real()`, `nat()`, `boolean()`, `constant()` → `ExactSizeArbitrary<T>`
   - `array()`, `set()` → `ExactSizeArbitrary<T[]>`

3. **Update transformation return types**:
   - `filter()` → `EstimatedSizeArbitrary<A>` (filtering introduces uncertainty)
   - `map()` → preserves base type (mapping doesn't change cardinality)

## Impact

- Affected specs: `arbitraries`
- Affected code: `src/arbitraries/types.ts`, `src/arbitraries/index.ts`, `src/arbitraries/Arbitrary.ts`
- **Non-breaking**: Interfaces extend `Arbitrary<A>`, all existing code compiles
- Better IDE autocompletion and type inference
