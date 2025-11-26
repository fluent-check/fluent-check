# Change: Use `const` Type Parameters for Literal Inference

## Why
Functions accepting arrays or tuples often lose literal type information without `as const` assertions from callers. TypeScript 5.0 introduced `const` type parameters that automatically infer literal types, improving type precision without requiring caller-side changes.

## What Changes
- Add `const` modifier to type parameters in tuple/array-accepting functions
- Primary targets:
  - `tuple()` in `src/arbitraries/index.ts`
  - `oneof()` in `src/arbitraries/index.ts`
  - Similar pattern functions in `src/arbitraries/regex.ts`
- No runtime behavior changes

## Impact
- Affected specs: None (type-level improvement)
- Affected code: `src/arbitraries/index.ts`, `src/arbitraries/regex.ts`
- Breaking: None (strictly additive type improvement)

## Example

**Before:**
```typescript
export const tuple = <U extends Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> =>
  // ...
```

**After:**
```typescript
export const tuple = <const U extends readonly Arbitrary<any>[]>(
  ...arbitraries: U
): Arbitrary<UnwrapFluentPick<U>> =>
  // ...
```

**Benefit:** Callers get more precise tuple types without needing `as const`.
