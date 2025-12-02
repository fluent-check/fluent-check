## 1. Implementation — `src/arbitraries/regex.ts`

### 1.1 Update `patterns` export (line ~421) ✅ **RECOMMENDED**

- [ ] 1.1.1 Add `satisfies Record<string, () => Arbitrary<string>>` after the closing brace
- [ ] 1.1.2 Verify `keyof typeof patterns` produces `'email' | 'uuid' | 'ipv4' | 'url'` (literal union, not `string`)
- [ ] 1.1.3 Verify return types are preserved (e.g., `patterns.ipv4()` still returns `Arbitrary<IPv4Address>`)

### 1.2 Update `getCharClassMap()` (line ~117) ⚠️ **OPTIONAL**

**Note**: This provides compile-time validation but literal keys are lost at function boundary due to return type annotation. Consider removing return type annotation for maximum benefit.

- [ ] 1.2.1 Remove `: Record<string, Arbitrary<string>>` return type annotation (to preserve literal keys)
- [ ] 1.2.2 Add `satisfies Record<string, Arbitrary<string>>` after the closing brace in the return statement
- [ ] 1.2.3 Verify return type is inferred with literal keys preserved (if return type annotation removed)
- [ ] 1.2.4 **Alternative**: Keep return type annotation if compile-time validation only is acceptable

## 2. Validation

- [ ] 2.1 Run `npm run lint` — ensure no new linting errors
- [ ] 2.2 Run `npm test` — ensure all tests pass
- [ ] 2.3 Run `tsc --noEmit` — verify type inference is preserved (no errors)
- [ ] 2.4 Spot-check that IDE autocomplete works for `patterns` keys

## 3. Type Verification (Manual)

Verify the following in IDE or via `tsc`:

```typescript
// Should be literal union, not 'string'
type PatternName = keyof typeof patterns
//   ^? 'email' | 'uuid' | 'ipv4' | 'url'

// For getCharClassMap(), this will only work if return type annotation is removed:
// If return type annotation is kept, this will be 'string' (literal keys lost)
// If return type annotation is removed, this should be literal union:
type CharClassKey = keyof ReturnType<typeof getCharClassMap>
//   ^? '\\d' | '[0-9]' | '\\w' | '[a-zA-Z0-9_]' | '\\s' | '.' | '[a-z]' | '[A-Z]' | '[a-zA-Z]' | '\\S' | '\\D' | '\\W'
```
