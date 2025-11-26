# Change: Adopt the `satisfies` Operator for Type Validation

## Why
The codebase uses explicit type annotations on object literals (e.g., `const x: Type = {...}`), which can widen types and lose literal key information. The `satisfies` operator (TypeScript 4.9+) validates that an expression matches a type while preserving the narrower inferred type, enabling better autocomplete and type safety.

## What Changes
- Replace type annotations with `satisfies` where literal type preservation is beneficial
- Primary target: `charClassMap` in `src/arbitraries/regex.ts`
- Secondary targets: Any other object literals where key preservation improves DX
- No runtime behavior changes

## Impact
- Affected specs: None (type-level change only)
- Affected code: `src/arbitraries/regex.ts`, potentially other files with Record-typed object literals
- Breaking: None (compile-time only, fully backwards compatible)

## Example

**Before:**
```typescript
const charClassMap: Record<string, Arbitrary<string>> = {
  '\\d': integer(0, 9).map(String),
  // Type loses literal key information
}
```

**After:**
```typescript
const charClassMap = {
  '\\d': integer(0, 9).map(String),
  // ...
} satisfies Record<string, Arbitrary<string>>
// Type preserves literal keys: { '\\d': ..., '[0-9]': ... }
```
