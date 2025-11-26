## 1. Type Definitions

- [ ] 1.1 Define `EscapeSequence` template literal type
- [ ] 1.2 Define `CharClassBracket` template literal type
- [ ] 1.3 Define `CharClassKey` union type
- [ ] 1.4 Add types to `src/arbitraries/types.ts` or `src/arbitraries/regex.ts`

## 2. Application

- [ ] 2.1 Apply `CharClassKey` type to `charClassMap` keys in `src/arbitraries/regex.ts`
- [ ] 2.2 Evaluate template literal types for `patterns.uuid()` return type
- [ ] 2.3 Evaluate template literal types for `patterns.email()` return type
- [ ] 2.4 Apply template literal types judiciously (avoid over-engineering)

## 3. Verification

- [ ] 3.1 Verify compile times are not significantly impacted
- [ ] 3.2 Verify error messages remain clear and actionable
- [ ] 3.3 Run full test suite to ensure no regressions
