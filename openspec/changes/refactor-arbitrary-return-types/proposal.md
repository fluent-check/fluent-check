# Change: Refactor Arbitrary Return Types for Type Precision

> **GitHub Issue:** [#437](https://github.com/fluent-check/fluent-check/issues/437)

## Why

Currently, factory functions like `integer()`, `boolean()`, and `constant()` return the abstract `Arbitrary<A>` type, even though the concrete implementations have more specific return types. This causes type information loss:

```typescript
// Current behavior
const arb = fc.integer(0, 100)  // type: Arbitrary<number>
const size = arb.size()         // type: ArbitrarySize (should be ExactSize)

// User must narrow manually despite the runtime always returning ExactSize
if (size.type === 'exact') {
  // Now TypeScript knows it's ExactSize
}
```

The discriminated union `ArbitrarySize = ExactSize | EstimatedSize` was introduced specifically for type narrowing, but its benefits are undermined when factory functions don't return specific types.

**Impact:**
- Users cannot leverage the discriminated union pattern without runtime checks
- Type-level tests must test what TypeScript infers, not what is actually true
- Violates the principle of producing the most specific type possible

## What Changes

1. **Add branded interfaces** that extend `Arbitrary<A>` with specific `size()` return types:
   - `ExactSizeArbitrary<A>` - for arbitraries with deterministic size
   - `EstimatedSizeArbitrary<A>` - for filtered arbitraries

2. **Update factory function return types** to use the specific interfaces:
   - `integer()`, `real()`, `nat()`, `constant()`, `boolean()` → `ExactSizeArbitrary<number>`
   - `set()`, `array()` → `ExactSizeArbitrary<T[]>`

3. **Update transformation method return types**:
   - `filter()` returns `EstimatedSizeArbitrary<A>` (always estimated after filtering)
   - `map()` preserves the base arbitrary's size type

## Impact

- Affected specs: `arbitraries`
- Affected code: `src/arbitraries/types.ts`, `src/arbitraries/index.ts`, `src/arbitraries/Arbitrary.ts`
- **Non-breaking**: All existing code continues to work (interfaces extend `Arbitrary<A>`)
- Improves type inference and IDE autocompletion
