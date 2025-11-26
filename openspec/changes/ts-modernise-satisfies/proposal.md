# Change: Adopt the `satisfies` Operator for Type Validation

> **GitHub Issue:** [#384](https://github.com/fluent-check/fluent-check/issues/384)

## Why

The codebase uses explicit type annotations on object literals (e.g., `const x: Type = {...}`), which causes **type widening** and loses valuable literal information. The `satisfies` operator (TypeScript 4.9+) validates that an expression matches a type while **preserving the narrower inferred type**.

### Key Benefits

1. **Literal Key Preservation**: `keyof typeof obj` produces a union of literal strings instead of just `string`
2. **Excess Property Checking**: TypeScript catches typos and extra properties at compile time
3. **Better Autocomplete**: IDEs can suggest exact keys when accessing the object
4. **Type-Safe Iteration**: `Object.keys()` results can be used without casting
5. **Value Type Preservation**: Literal values, tuple types, and narrower types are preserved
6. **Future-Proof**: Enables downstream consumers to build type-safe utilities

## What Changes

### Primary Targets

| File | Object | Current Type | Benefit |
|------|--------|--------------|---------|
| `src/arbitraries/regex.ts` | `charClassMap` | `Record<string, Arbitrary<string>>` | Preserves 14 literal keys (`'\\d'`, `'[0-9]'`, etc.) for type-safe lookups |
| `src/arbitraries/regex.ts` | `simplifyMappings` | `Record<string, string[]>` | Preserves digit key literals for shrinking logic |
| `src/arbitraries/regex.ts` | `patterns` | Implicit object type | Exports `'email' \| 'uuid' \| 'ipv4' \| 'url'` as literal union via `keyof typeof patterns` |

### Runtime Behavior
- **No runtime changes** - this is purely a compile-time improvement

## Impact

- **Affected specs**: None (type-level change only)
- **Affected code**: `src/arbitraries/regex.ts`
- **Breaking**: None (fully backwards compatible, emitted JS unchanged)
- **TypeScript version**: Requires 4.9+ (project uses 5.9.3 ✓)

## Examples

### Example 1: `charClassMap` (Record Type)

**Before:**
```typescript
const charClassMap: Record<string, Arbitrary<string>> = {
  '\\d': integer(0, 9).map(String),
  '[0-9]': integer(0, 9).map(String),
  // ...
}

// Type: Record<string, Arbitrary<string>>
// keyof typeof charClassMap → string (lost literal info)
```

**After:**
```typescript
const charClassMap = {
  '\\d': integer(0, 9).map(String),
  '[0-9]': integer(0, 9).map(String),
  // ...
} satisfies Record<string, Arbitrary<string>>

// Type: { '\\d': Arbitrary<string>, '[0-9]': Arbitrary<string>, ... }
// keyof typeof charClassMap → '\\d' | '[0-9]' | '\\w' | ... (literal union!)
```

### Example 2: `patterns` (Exported API)

**Before:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { /* ... */ },
  uuid: (): Arbitrary<string> => { /* ... */ },
  // ...
}

// No validation that all methods return Arbitrary<string>
```

**After:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { /* ... */ },
  uuid: (): Arbitrary<string> => { /* ... */ },
  // ...
} satisfies Record<string, () => Arbitrary<string>>

// ✓ Validates all patterns return Arbitrary<string>
// ✓ keyof typeof patterns → 'email' | 'uuid' | 'ipv4' | 'url'
// ✓ Consumers can type-safely iterate: Object.keys(patterns) as (keyof typeof patterns)[]
```

## Consumer Benefits

After this change, library consumers can write:

```typescript
import { patterns } from 'fluent-check'

// Type-safe pattern names
type PatternName = keyof typeof patterns // 'email' | 'uuid' | 'ipv4' | 'url'

// Autocomplete works!
const emailArb = patterns.email() // ✓ IDE suggests all pattern names

// Type-safe iteration
const allPatterns = (Object.keys(patterns) as PatternName[]).map(name => ({
  name,
  arbitrary: patterns[name]()
}))
```
