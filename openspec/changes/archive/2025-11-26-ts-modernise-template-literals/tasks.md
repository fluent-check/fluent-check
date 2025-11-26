## 1. Core Type Definitions

- [x] 1.1 Define `EscapeSequence` template literal type (`\\d`, `\\w`, `\\s`, `\\D`, `\\W`, `\\S`)
- [x] 1.2 Define `CharClassBracket` template literal type for `[${string}]` patterns
- [x] 1.3 Define `CharClassKey` union type combining escape sequences, brackets, and `.`
- [x] 1.4 Define `HexChar` literal union type for hex digit characters
- [x] 1.5 Define `IPv4Address` template literal type (`${number}.${number}.${number}.${number}`)
- [x] 1.6 Define `HttpProtocol` and `HttpUrl` types for URL patterns
- [x] 1.7 Add all types to `src/arbitraries/types.ts`

## 2. Application to `charClassMap`

- [x] 2.1 Apply `CharClassKey` type to `charClassMap` keys in `src/arbitraries/regex.ts`
- [x] 2.2 Verify all existing keys match the type (should be compile-time validated)
- [x] 2.3 Update any helper functions that access `charClassMap` to use typed keys

## 3. Pattern Return Types

- [x] 3.1 Update `patterns.ipv4()` return type to `Arbitrary<IPv4Address>`
- [x] 3.2 Update `patterns.url()` return type to `Arbitrary<HttpUrl>`
- [x] 3.3 Add type assertion in `ipv4()` implementation (`as IPv4Address`)
- [x] 3.4 Add type assertion in `url()` implementation (`as HttpUrl`)
- [x] 3.5 Document decision NOT to type `patterns.uuid()` and `patterns.email()` (impractical, see Non-Goals)

## 4. Hex Arbitrary Enhancement

- [x] 4.1 Export `HexChar` type from `src/arbitraries/types.ts`
- [x] 4.2 Update `hex()` in `src/arbitraries/string.ts` to return `Arbitrary<HexChar>`
- [x] 4.3 Consider if UUID generation in `patterns.uuid()` should use the typed `hex()` internally

## 5. Verification

- [x] 5.1 Verify compile times are not significantly impacted (< 10% increase)
- [x] 5.2 Verify error messages remain clear and actionable (test with intentional typos)
- [x] 5.3 Verify IDE autocomplete works for `charClassMap` keys
- [x] 5.4 Run full test suite to ensure no regressions
- [x] 5.5 Test that typed return types (`IPv4Address`, `HttpUrl`) work in downstream type contexts
