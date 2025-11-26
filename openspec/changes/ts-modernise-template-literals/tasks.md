## 1. Core Type Definitions

- [ ] 1.1 Define `EscapeSequence` template literal type (`\\d`, `\\w`, `\\s`, `\\D`, `\\W`, `\\S`)
- [ ] 1.2 Define `CharClassBracket` template literal type for `[${string}]` patterns
- [ ] 1.3 Define `CharClassKey` union type combining escape sequences, brackets, and `.`
- [ ] 1.4 Define `HexChar` literal union type for hex digit characters
- [ ] 1.5 Define `IPv4Address` template literal type (`${number}.${number}.${number}.${number}`)
- [ ] 1.6 Define `HttpProtocol` and `HttpUrl` types for URL patterns
- [ ] 1.7 Add all types to `src/arbitraries/types.ts`

## 2. Application to `charClassMap`

- [ ] 2.1 Apply `CharClassKey` type to `charClassMap` keys in `src/arbitraries/regex.ts`
- [ ] 2.2 Verify all existing keys match the type (should be compile-time validated)
- [ ] 2.3 Update any helper functions that access `charClassMap` to use typed keys

## 3. Pattern Return Types

- [ ] 3.1 Update `patterns.ipv4()` return type to `Arbitrary<IPv4Address>`
- [ ] 3.2 Update `patterns.url()` return type to `Arbitrary<HttpUrl>`
- [ ] 3.3 Add type assertion in `ipv4()` implementation (`as IPv4Address`)
- [ ] 3.4 Add type assertion in `url()` implementation (`as HttpUrl`)
- [ ] 3.5 Document decision NOT to type `patterns.uuid()` and `patterns.email()` (impractical, see Non-Goals)

## 4. Hex Arbitrary Enhancement

- [ ] 4.1 Export `HexChar` type from `src/arbitraries/types.ts`
- [ ] 4.2 Update `hex()` in `src/arbitraries/string.ts` to return `Arbitrary<HexChar>`
- [ ] 4.3 Consider if UUID generation in `patterns.uuid()` should use the typed `hex()` internally

## 5. Verification

- [ ] 5.1 Verify compile times are not significantly impacted (< 10% increase)
- [ ] 5.2 Verify error messages remain clear and actionable (test with intentional typos)
- [ ] 5.3 Verify IDE autocomplete works for `charClassMap` keys
- [ ] 5.4 Run full test suite to ensure no regressions
- [ ] 5.5 Test that typed return types (`IPv4Address`, `HttpUrl`) work in downstream type contexts
