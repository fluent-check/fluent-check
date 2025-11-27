## 1. Implementation — `src/arbitraries/regex.ts`

### 1.1 Update `charClassMap` (line ~50)

- [x] 1.1.1 Remove `: Record<CharClassKey, Arbitrary<string>>` type annotation
- [x] 1.1.2 Add `satisfies Record<string, Arbitrary<string>>` after the closing brace
- [x] 1.1.3 Verify `keyof typeof charClassMap` produces literal union (12 keys)

### 1.2 Update `simplifyMappings` (line ~510, inside `shrinkRegexString`)

- [x] 1.2.1 Remove `: Record<string, string[]>` type annotation
- [x] 1.2.2 Add `satisfies Record<string, string[]>` after the closing brace

### 1.3 Update `patterns` export (line ~352)

- [x] 1.3.1 Add `satisfies Record<string, () => Arbitrary<string>>` after the closing brace
- [x] 1.3.2 Verify `keyof typeof patterns` produces `'email' | 'uuid' | 'ipv4' | 'url'`

## 2. Validation

- [x] 2.1 Run `npm run lint` — N/A (ESLint config migration needed, pre-existing issue)
- [x] 2.2 Run `npm test` — all 127 tests pass
- [x] 2.3 Run `tsc --noEmit` — no errors, type inference preserved
- [x] 2.4 Spot-check that IDE autocomplete works for `charClassMap` and `patterns` keys

## 3. Type Verification

Added compile-time type assertions in `test/regex.test.ts`:

```typescript
// Type-level test: patterns should have literal key union type
type PatternKeys = keyof typeof fc.patterns
type ExpectedPatternKeys = 'email' | 'uuid' | 'ipv4' | 'url'

// This line will cause a compile error if PatternKeys !== ExpectedPatternKeys
const _patternKeysTest: AssertEquals<PatternKeys, ExpectedPatternKeys> = true
```

Added runtime tests to verify:
- Pattern keys can be iterated type-safely
- Type-safe pattern name extraction works at compile-time
