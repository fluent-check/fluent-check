# Change: Add InvalidArbitrary for Configuration Error Handling

> **GitHub Issue:** [#118](https://github.com/fluent-check/fluent-check/issues/118)

## Why

Currently, invalid arbitrary constructions (e.g., `fc.integer(10, 0)` with inverted bounds) silently return `NoArbitrary`. While mathematically correct (vacuous truth for universal quantification over an empty set), this behavior can be confusing for users who may not realize their tests are passing for the wrong reasons.

As discussed in issue #118, there are different levels of "invalid":
1. **Semantically meaningless** - e.g., array of size -5 (no interpretation possible)
2. **Empty range** - e.g., `fc.integer(10, 0)` where min > max
3. **Intersectable** - e.g., `fc.nat(-3, 10)` which can be corrected to `fc.nat(0, 10)`

The current implementation handles case 3 correctly but silently degrades cases 1 and 2 to `NoArbitrary`, which can mask configuration errors in tests.

### Why Not Throw Exceptions?

The framework is built on **type safety and functional composition**, not runtime exceptions. Throwing at construction time:
- Breaks compositional nature of arbitraries
- Feels un-functional and surprising
- Prevents building up complex arbitraries that might only become invalid in certain contexts

## What Changes

### New Type: `InvalidArbitrary<Reason>`

Introduce a third type distinct from `NoArbitrary`:

| Type | Meaning | Source | Test Result |
|------|---------|--------|-------------|
| `NoArbitrary` | Legitimate empty set | Internal (shrinking exhausted, filter eliminated all) | Pass (vacuously true) |
| `InvalidArbitrary<R>` | Configuration error | User API misuse | **Fail** with diagnostic |

```typescript
// New type that carries error context but behaves like an empty arbitrary
export interface InvalidArbitrary<R extends string = string> extends Arbitrary<never> {
  readonly _tag: 'invalid'
  readonly reason: R
}

export const InvalidArbitrary = <R extends string>(reason: R): InvalidArbitrary<R> => 
  new class extends Arbitrary<never> {
    readonly _tag = 'invalid' as const
    readonly reason = reason
    
    pick(): undefined { return undefined }
    size(): ArbitrarySize { return { value: 0, type: 'exact', credibleInterval: [0, 0] } }
    // ... same runtime behavior as NoArbitrary
  }()
```

### Public API Changes

- `fc.integer(min, max)` SHALL return `InvalidArbitrary` when `min > max`
- `fc.real(min, max)` SHALL return `InvalidArbitrary` when `min > max`
- `fc.nat(min, max)` SHALL return `InvalidArbitrary` when `max < 0`
- `fc.array(arb, min, max)` SHALL return `InvalidArbitrary` when `min > max` or `min < 0`
- `fc.set(elements, min, max)` SHALL return `InvalidArbitrary` when `min > max`, `min < 0`, or `min > elements.length`
- `fc.oneof(elements)` SHALL return `InvalidArbitrary` when `elements` is empty

### Internal Behavior Unchanged

- `shrink()` methods continue to return `NoArbitrary` for legitimate empty ranges
- `filter()` continues to return `NoArbitrary` when all values filtered out
- No changes to shrinking algorithm

### FluentCheck Runner Changes

The runner detects `InvalidArbitrary` during property evaluation:

```typescript
// FluentCheck.ts - during property evaluation
private evaluateProperty<T>(arb: Arbitrary<T>): PropertyResult {
  if (isInvalidArbitrary(arb)) {
    return { 
      status: 'invalid',  // distinct from 'pass' | 'fail'
      reason: arb.reason,
      suggestion: 'Check your arbitrary configuration'
    }
  }
  // ... normal evaluation
}
```

Output:
```
✗ Property "user ages are positive" - INVALID CONFIGURATION
  → integer: min (10) exceeds max (5)
```

## Impact

- **Affected specs**: `arbitraries`, `reporting`
- **Affected code**: 
  - `src/arbitraries/InvalidArbitrary.ts` (new file)
  - `src/arbitraries/index.ts` (factory functions)
  - `src/FluentCheck.ts` (runner detection)
  - `src/FluentReporter.ts` (output formatting)
- **Breaking**: Behavioral - invalid configurations that previously passed silently will now fail
- **Migration**: Users must fix invalid arbitrary configurations (the correct fix for their bug)

## Rationale

1. **Preserves composition**: No exceptions during construction, arbitraries compose freely
2. **Semantic distinction**: Clear difference between "legitimately empty" and "configuration error"
3. **Actionable feedback**: Error messages explain what's wrong and how to fix it
4. **No silent pass**: Invalid configurations fail tests, surfacing bugs early
5. **Shrinking unaffected**: Internal `NoArbitrary` usage continues to work correctly
6. **Type-safe philosophy**: Aligns with framework's emphasis on types over runtime checks
