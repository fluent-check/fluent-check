# Change: Add Common Arbitrary Presets

> **GitHub Issue:** [#409](https://github.com/fluent-check/fluent-check/issues/409)

## Why

Analysis of the test suite shows that common patterns like "positive integer", "non-empty array", and "nullable value" require verbose setup with explicit ranges or filter conditions. These patterns are frequent enough to warrant shorthand factories that improve readability and reduce boilerplate.

## What Changes

Add shorthand factory functions for frequently-used arbitrary configurations:

### Integer Presets
```typescript
fc.positiveInt()      // integer(1, MAX_SAFE_INTEGER)
fc.negativeInt()      // integer(MIN_SAFE_INTEGER, -1)
fc.nonZeroInt()       // union(negativeInt(), positiveInt())
fc.byte()             // integer(0, 255)
```

### String Presets
```typescript
fc.nonEmptyString(maxLength?)  // string(1, maxLength)
```

### Collection Presets
```typescript
fc.nonEmptyArray(arb, maxLength?)  // array(arb, 1, maxLength)
fc.pair(arb)                        // tuple(arb, arb)
```

### Nullable/Optional Presets
```typescript
fc.nullable(arb)   // union(arb, constant(null))
fc.optional(arb)   // union(arb, constant(undefined))
```

## Impact

- Affected specs: `arbitraries`
- Affected code: `src/arbitraries/index.ts`
- Breaking: None - additive change
- Verbosity reduction: 30% for affected patterns
