# Change: Leverage Template Literal Types for Pattern Validation

## Why
TypeScript's template literal types enable compile-time validation of string patterns. For a property-based testing library dealing with regex patterns, UUIDs, emails, and other structured strings, template literal types can provide stronger type guarantees and better developer experience through autocomplete and error messages.

## What Changes
- Define template literal types for structured string patterns
- Apply to regex character class keys in `charClassMap` for compile-time key validation
- Add typed return types for `patterns.ipv4()` and `patterns.url()` where practical
- Define reusable `HexChar` type for UUID and hex-related generation
- Add type-safe string pattern validation where beneficial

## Impact
- Affected specs: None (type-level enhancement)
- Affected code: `src/arbitraries/types.ts`, `src/arbitraries/regex.ts`, `src/arbitraries/string.ts`
- Breaking: None (additive type improvement)

## Benefits
1. **Compile-time key validation**: Prevents typos in `charClassMap` keys (e.g., `\\D` vs `\\d`)
2. **IDE autocomplete**: Valid keys are suggested when adding new character class mappings
3. **Self-documenting types**: Type definitions serve as documentation for supported patterns
4. **Better error messages**: TypeScript errors point to exact invalid keys
5. **Type narrowing**: Return types like `IPv4Address` enable downstream type-safe operations

## Example

**Escape sequence and character class types:**
```typescript
// Escape sequences: \d, \w, \s, \D, \W, \S
type EscapeSequence = `\\${'d' | 'w' | 's' | 'D' | 'W' | 'S'}`

// Character class brackets like [a-z], [0-9]
type CharClassBracket = `[${string}]`

// Valid char class map keys
type CharClassKey = EscapeSequence | CharClassBracket | '.'
```

**Applied to charClassMap:**
```typescript
const charClassMap: Record<CharClassKey, Arbitrary<string>> = {
  '\\d': integer(0, 9).map(String),
  '\\w': union(char('a', 'z'), char('A', 'Z'), integer(0, 9).map(String), constant('_')),
  // TypeScript validates keys match CharClassKey pattern
  // '\\x': ... // ❌ Type error: '\\x' is not assignable to CharClassKey
}
```

**Practical typed return types:**
```typescript
// IPv4 addresses - practical and useful
type IPv4Address = `${number}.${number}.${number}.${number}`

ipv4: (): Arbitrary<IPv4Address> => {
  const octet = integer(0, 255)
  return tuple(octet, octet, octet, octet)
    .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}` as IPv4Address)
}

// URL with typed protocol
type HttpProtocol = 'http' | 'https'
type HttpUrl = `${HttpProtocol}://${string}`

url: (): Arbitrary<HttpUrl> => { ... }
```

**Reusable hex character type:**
```typescript
type HexChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
// Used in UUID generation and hex arbitrary
```

## Non-Goals
- **UUID/Email return types**: Template literals cannot practically validate UUIDs (e.g., `${string}-${string}-4${string}...` is too loose and matches invalid strings like `"-4-a-"`). Email validation is even more complex. These patterns benefit from runtime validation, not type-level validation.
- **Complex regex type inference**: Inferring types from arbitrary regex patterns would require complex type-level programming that impacts compilation speed with diminishing returns.

## Notes
Template literal types should be applied judiciously. Overly complex template types can slow down compilation and produce confusing error messages. Focus on types that provide practical value:
- Key validation for finite, known sets (like `charClassMap`)
- Simple structural types (like `IPv4Address`)
- Protocol prefixes (like `http://` | `https://`)

Avoid template literal types for patterns with variable-length components or complex validation rules.
