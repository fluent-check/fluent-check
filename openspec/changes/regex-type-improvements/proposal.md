# Change: Improve Regex Type Safety with `satisfies` Operator

> **GitHub Issue:** [#384](https://github.com/fluent-check/fluent-check/issues/384)

## Executive Summary

This change improves type safety in `src/arbitraries/regex.ts` by adopting the `satisfies` operator (TypeScript 4.9+) to preserve literal key types while maintaining type validation. The benefits vary significantly between different objects:

- ✅ **`patterns` export**: Strong recommendation - clear benefit for public API consumers
- ⚠️ **`getCharClassMap()`**: Limited value - literal keys are lost at function boundary, but provides compile-time validation
- ❌ **`simplifyMappings`**: Removed from scope - doesn't exist in current codebase

**Key Insight**: Using `satisfies` inside a function with an explicit return type annotation (`Record<string, T>`) provides compile-time validation but **doesn't preserve literal keys** for callers. The return type annotation widens the keys back to `string`.

## Why

The `regex.ts` file uses explicit type annotations on object literals (e.g., `const x: Type = {...}`), which causes **type widening** and loses valuable literal information. The `satisfies` operator validates that an expression matches a type while **preserving the narrower inferred type**.

### Key Benefits

1. **Literal Key Preservation**: `keyof typeof obj` produces a union of literal strings instead of just `string`
2. **Excess Property Checking**: TypeScript catches typos and extra properties at compile time
3. **Better Autocomplete**: IDEs can suggest exact keys when accessing the object
4. **Type-Safe Iteration**: `Object.keys()` results can be used without casting
5. **Value Type Preservation**: Literal values, tuple types, and narrower types are preserved
6. **Future-Proof**: Enables downstream consumers to build type-safe utilities

## What Changes

### Primary Targets

| File | Object | Current Type | Benefit | Status |
|------|--------|--------------|---------|--------|
| `src/arbitraries/regex.ts` | `patterns` | Implicit object type | Exports `'email' \| 'uuid' \| 'ipv4' \| 'url'` as literal union via `keyof typeof patterns` | ✅ **Recommended** |
| `src/arbitraries/regex.ts` | `getCharClassMap()` | `Record<string, Arbitrary<string>>` | Compile-time validation only (literal keys lost at function boundary) | ⚠️ **Limited Value** |

**Note**: `simplifyMappings` was originally proposed but doesn't exist in the current codebase (replaced by `getSimplerChars()` function during refactor-regex-structure).

### Runtime Behavior
- **No runtime changes** - this is purely a compile-time improvement

## Impact

- **Affected specs**: None (type-level change only)
- **Affected code**: `src/arbitraries/regex.ts`
- **Breaking**: None (fully backwards compatible, emitted JS unchanged)
- **TypeScript version**: Requires 4.9+ (project uses 5.9.3 ✓)

## Detailed Analysis

### 1. `patterns` Export ✅ **STRONGLY RECOMMENDED**

**Current State:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { ... },
  uuid: (): Arbitrary<string> => { ... },
  ipv4: (): Arbitrary<IPv4Address> => { ... },
  url: (): Arbitrary<HttpUrl> => { ... }
}
```

**Proposed Change:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { ... },
  uuid: (): Arbitrary<string> => { ... },
  ipv4: (): Arbitrary<IPv4Address> => { ... },
  url: (): Arbitrary<HttpUrl> => { ... }
} satisfies Record<string, () => Arbitrary<string>>
```

**Benefits:**
- ✅ **Public API**: This is exported and consumers can benefit from literal key types
- ✅ **Type Safety**: Validates all methods return something assignable to `Arbitrary<string>`
- ✅ **Consumer Value**: `keyof typeof patterns` becomes `'email' | 'uuid' | 'ipv4' | 'url'` instead of `string`
- ✅ **Iteration Safety**: Consumers can iterate with type safety
- ✅ **Return Type Preservation**: `satisfies` preserves actual return types (`Arbitrary<IPv4Address>`, `Arbitrary<HttpUrl>`) while validating compatibility

**Type Compatibility**: Since `IPv4Address` and `HttpUrl` are template literal types that extend `string`, `Arbitrary<IPv4Address>` and `Arbitrary<HttpUrl>` are assignable to `Arbitrary<string>`, so the constraint works correctly.

### 2. `getCharClassMap()` / `charClassMap` ⚠️ **LIMITED VALUE**

**Current State:**
```typescript
function getCharClassMap(): Record<string, Arbitrary<string>> {
  return {
    '\\d': integer(0, 9).map(String),
    '[0-9]': integer(0, 9).map(String),
    '\\w': wordChars(),
    // ... 14 total keys
  }
}
```

**Usage Pattern:**
```typescript
const charClassMap = getCharClassMap()
if (charClassMap[escapeSeq] !== undefined) {  // escapeSeq is runtime string
  // ...
}
const generator = charClassMap[charClass] ?? parseCustomCharClass(charClass)  // charClass is runtime string
```

**Proposed Change:**
```typescript
function getCharClassMap() {
  return {
    '\\d': integer(0, 9).map(String),
    '[0-9]': integer(0, 9).map(String),
    // ...
  } satisfies Record<string, Arbitrary<string>>
}
```

**Analysis:**

**Benefits:**
- ✅ **Compile-time Validation**: TypeScript validates all values are `Arbitrary<string>`
- ✅ **No Runtime Impact**: Purely compile-time improvement

**Limitations:**
- ⚠️ **Function Return Type Widening**: The function's return type annotation `Record<string, Arbitrary<string>>` widens keys back to `string`, so literal keys are lost at the function boundary
- ⚠️ **Dynamic Lookups**: The keys (`escapeSeq`, `charClass`) come from **parsed regex patterns at runtime**. Even with literal keys preserved, TypeScript can't narrow dynamic lookups
- ⚠️ **Limited Caller Benefit**: Callers get `Record<string, Arbitrary<string>>` regardless of what's inside the function

**Critical Issue**: Using `satisfies` inside a function with an explicit return type annotation provides compile-time validation but **NO runtime type benefit to callers**. The literal keys are lost at the function boundary.

**Recommendation**: 
- **Option 1 (Recommended)**: Remove return type annotation to let TypeScript infer:
  ```typescript
  function getCharClassMap() {
    return {
      // ...
    } satisfies Record<string, Arbitrary<string>>
    // Return type would be inferred with literal keys preserved
  }
  ```
- **Option 2**: Make `charClassMap` a const (if circular dependencies allow):
  ```typescript
  const charClassMap = {
    // ...
  } satisfies Record<CharClassKey, Arbitrary<string>> & Record<string, Arbitrary<string>>
  
  function getCharClassMap() {
    return charClassMap  // Return type inferred as typeof charClassMap
  }
  ```
- **Option 3**: Accept compile-time validation only with current function signature

**However**, even with literal keys preserved, the dynamic lookups (`charClassMap[escapeSeq]` where `escapeSeq` is a runtime string) still won't benefit from type narrowing. The value is primarily in compile-time validation and potential future refactoring.

## Examples

### Example 1: `patterns` (Exported API) ✅

**Before:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { /* ... */ },
  uuid: (): Arbitrary<string> => { /* ... */ },
  ipv4: (): Arbitrary<IPv4Address> => { /* ... */ },
  url: (): Arbitrary<HttpUrl> => { /* ... */ }
}

// No validation that all methods return Arbitrary<string>
// keyof typeof patterns → string (no literal info)
```

**After:**
```typescript
export const patterns = {
  email: (): Arbitrary<string> => { /* ... */ },
  uuid: (): Arbitrary<string> => { /* ... */ },
  ipv4: (): Arbitrary<IPv4Address> => { /* ... */ },
  url: (): Arbitrary<HttpUrl> => { /* ... */ }
} satisfies Record<string, () => Arbitrary<string>>

// ✓ Validates all patterns return something assignable to Arbitrary<string>
// ✓ keyof typeof patterns → 'email' | 'uuid' | 'ipv4' | 'url' (literal union!)
// ✓ Consumers can type-safely iterate: Object.keys(patterns) as (keyof typeof patterns)[]
// ✓ Return types preserved: patterns.ipv4() still returns Arbitrary<IPv4Address>
```

### Example 2: `getCharClassMap()` ⚠️

**Current (with return type annotation):**
```typescript
function getCharClassMap(): Record<string, Arbitrary<string>> {
  return {
    '\\d': integer(0, 9).map(String),
    '[0-9]': integer(0, 9).map(String),
    // ...
  }
}

// Callers get: Record<string, Arbitrary<string>>
// Literal keys lost at function boundary
```

**Proposed (remove return type annotation):**
```typescript
function getCharClassMap() {
  return {
    '\\d': integer(0, 9).map(String),
    '[0-9]': integer(0, 9).map(String),
    // ...
  } satisfies Record<string, Arbitrary<string>>
}

// Return type inferred with literal keys preserved
// But dynamic lookups still can't benefit from narrowing
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

## Recommendations

### Immediate Actions

1. ✅ **Apply `satisfies` to `patterns`** - Clear benefit for public API
2. ⚠️ **Conditionally apply to `getCharClassMap()`** - Remove return type annotation for maximum benefit, or accept compile-time validation only
3. ❌ **Remove `simplifyMappings` from scope** - Doesn't exist in current codebase

### Future Considerations

1. **Consider making `charClassMap` a const** (if circular dependencies allow) for better type preservation
2. **Consider type-safe lookup helpers** for `charClassMap` if dynamic lookups need better type safety

## Conclusion

The proposal is **partially sound**:
- ✅ `patterns`: Strong recommendation to proceed
- ⚠️ `getCharClassMap()`: Limited benefit due to dynamic lookups and function return type widening, but harmless and provides compile-time validation
- ❌ `simplifyMappings`: Removed from scope

The fundamental premise of keeping types narrow is correct, but the implementation needs to account for:
1. Dynamic vs. static key access patterns
2. Return type preservation vs. widening at function boundaries
3. Public API vs. internal implementation concerns
