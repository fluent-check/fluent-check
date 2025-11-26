## 1. Implementation — `src/arbitraries/regex.ts`

### 1.1 Update `charClassMap` (line ~50)

- [ ] 1.1.1 Remove `: Record<string, Arbitrary<string>>` type annotation
- [ ] 1.1.2 Add `satisfies Record<string, Arbitrary<string>>` after the closing brace
- [ ] 1.1.3 Verify `keyof typeof charClassMap` produces literal union (14 keys)

### 1.2 Update `simplifyMappings` (line ~507, inside `shrinkRegexString`)

- [ ] 1.2.1 Remove `: Record<string, string[]>` type annotation
- [ ] 1.2.2 Add `satisfies Record<string, string[]>` after the closing brace

### 1.3 Update `patterns` export (line ~348)

- [ ] 1.3.1 Add `satisfies Record<string, () => Arbitrary<string>>` after the closing brace
- [ ] 1.3.2 Verify `keyof typeof patterns` produces `'email' | 'uuid' | 'ipv4' | 'url'`

## 2. Validation

- [ ] 2.1 Run `npm run lint` — ensure no new linting errors
- [ ] 2.2 Run `npm test` — ensure all tests pass
- [ ] 2.3 Run `tsc --noEmit` — verify type inference is preserved (no errors)
- [ ] 2.4 Spot-check that IDE autocomplete works for `charClassMap` and `patterns` keys

## 3. Type Verification (Manual)

Verify the following in IDE or via `tsc`:

```typescript
// Should be literal union, not 'string'
type CharClassKey = keyof typeof charClassMap
//   ^? '\\d' | '[0-9]' | '\\w' | '[a-zA-Z0-9_]' | '\\s' | '.' | '[a-z]' | '[A-Z]' | '[a-zA-Z]' | '\\S' | '\\D' | '\\W'

// Should be literal union, not 'string'  
type PatternName = keyof typeof patterns
//   ^? 'email' | 'uuid' | 'ipv4' | 'url'
```
