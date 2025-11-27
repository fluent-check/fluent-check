# Change: Add `suchThat` Alias for `filter`

> **GitHub Issue:** [#408](https://github.com/fluent-check/fluent-check/issues/408)

## Why

QuickCheck, ScalaCheck, and other property testing frameworks use `suchThat` as the standard name for filtered generation. Developers coming from these frameworks expect this naming convention. Adding `suchThat` as an alias improves discoverability and familiarity without removing the existing `filter` method.

## What Changes

- Add `suchThat()` method to `Arbitrary` class as an alias for `filter()`
- Both methods have identical behavior and type signatures
- No changes to existing `filter()` functionality

### API

```typescript
// These are equivalent
fc.integer().filter(x => x > 0)
fc.integer().suchThat(x => x > 0)

// Reads more naturally in property testing context
fc.integer().suchThat(x => x % 2 === 0)  // "integer such that it's even"
```

## Impact

- Affected specs: `arbitraries`
- Affected code: `src/arbitraries/Arbitrary.ts`
- Breaking: None - additive change
- Implementation effort: Minimal (one-line alias)
