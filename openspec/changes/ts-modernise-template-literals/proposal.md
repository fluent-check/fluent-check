# Change: Leverage Template Literal Types for Pattern Validation

## Why
TypeScript's template literal types enable compile-time validation of string patterns. For a property-based testing library dealing with regex patterns, UUIDs, emails, and other structured strings, template literal types can provide stronger type guarantees and better developer experience through autocomplete and error messages.

## What Changes
- Define template literal types for structured string patterns
- Apply to regex character class keys in `charClassMap`
- Consider typed patterns for `patterns.uuid()`, `patterns.email()`, etc. return types
- Add type-safe string pattern validation where beneficial

## Impact
- Affected specs: None (type-level enhancement)
- Affected code: `src/arbitraries/types.ts`, `src/arbitraries/regex.ts`
- Breaking: None (additive type improvement)

## Example

**New type definitions:**
```typescript
// Escape sequences like \d, \w, \s
type EscapeSequence = `\\${'d' | 'w' | 's' | 'D' | 'W' | 'S'}`

// Character class brackets like [a-z], [0-9]
type CharClassBracket = `[${string}]`

// Valid char class map keys
type CharClassKey = EscapeSequence | CharClassBracket | '.'

// UUID v4 pattern type
type HexChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
type UUIDv4 = `${string}-${string}-4${string}-${'8' | '9' | 'a' | 'b'}${string}-${string}`
```

**Applied to charClassMap:**
```typescript
const charClassMap: Record<CharClassKey, Arbitrary<string>> = {
  '\\d': integer(0, 9).map(String),
  // TypeScript validates keys match CharClassKey pattern
}
```

## Notes
Template literal types should be applied judiciously. Overly complex template types can slow down compilation and produce confusing error messages.
