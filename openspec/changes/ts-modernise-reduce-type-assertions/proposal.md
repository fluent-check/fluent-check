# Change: Reduce `as unknown as` Type Assertions

## Why
The codebase contains 14 instances of `as unknown as Arbitrary<T>` type assertions across 3 files (`src/arbitraries/index.ts`, `src/arbitraries/regex.ts`, `src/arbitraries/ArbitraryTuple.ts`). These bypass TypeScript's type checking and can mask genuine type errors. Investigation reveals the root cause is a combination of incomplete strict mode configuration and the `NoArbitrary: Arbitrary<never>` singleton not unifying cleanly with concrete arbitrary types.

## Root Cause Analysis

### 1. Incomplete Strict Mode
The current `tsconfig.json` has individual strict flags but **NOT** `strict: true`:
```json
"strictNullChecks": true,
"strictFunctionTypes": true,
"strictPropertyInitialization": true,
"noImplicitThis": true
```
Missing critical checks: `noImplicitAny`, `strictBindCallApply`, `useUnknownInCatchVariables`, `alwaysStrict`.

### 2. NoArbitrary Type Incompatibility
`NoArbitrary: Arbitrary<never>` creates type inference issues in ternary expressions:
```typescript
// TypeScript infers: Arbitrary<never> | ArbitraryConstant<number>
// Expected: Arbitrary<number>
min > max ? NoArbitrary : new ArbitraryConstant(min)
```
The `never` type is the bottom type and *should* be assignable to any `Arbitrary<T>`, but TypeScript's inference doesn't widen this automatically in all contexts.

### 3. Classes Are Actually Compatible
All concrete arbitrary classes properly extend `Arbitrary<T>`:
- `ArbitraryInteger extends Arbitrary<number>` ✅
- `ArbitraryConstant<A> extends Arbitrary<A>` ✅
- `ArbitraryBoolean extends MappedArbitrary<number, boolean>` → `Arbitrary<boolean>` ✅

The assertions shouldn't be necessary if the type system is configured correctly.

## What Changes

### Phase 1: Enable Full Strict Mode (High Impact)
- Enable `strict: true` in `tsconfig.json`
- Fix any new errors that surface (likely few, as most strict options are already enabled)
- This may resolve some assertions automatically

### Phase 2: Fix NoArbitrary Pattern
Replace the singleton with a generic factory or use explicit type annotations:

**Option A: Generic NoArbitrary function**
```typescript
// Create a generic factory that returns properly typed empty arbitrary
function noArbitrary<T>(): Arbitrary<T> {
  return NoArbitraryInstance as Arbitrary<T>;
}
```

**Option B: Use explicit return type widening**
```typescript
// Explicit type annotation forces correct inference
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => {
  if (min > max) return NoArbitrary;
  if (min === max) return new ArbitraryConstant(min);
  return new ArbitraryInteger(min, max);
};
```

**Option C: Conditional return types (most type-safe)**
```typescript
type IntegerResult<Min extends number, Max extends number> = 
  Min extends Max ? ArbitraryConstant<Min> : ArbitraryInteger;
```

### Phase 3: Remove Remaining Assertions
After phases 1-2, systematically remove remaining `as unknown as` assertions and verify TypeScript accepts the code.

## Impact

- **Affected specs**: None (internal type safety improvement)
- **Affected code**: 
  - `tsconfig.json` (strict mode)
  - `src/arbitraries/index.ts` (9 assertions)
  - `src/arbitraries/regex.ts` (5 assertions)
  - `src/arbitraries/ArbitraryTuple.ts` (1 assertion)
  - Potentially `src/arbitraries/NoArbitrary.ts` (pattern change)
- **Breaking**: None externally; may surface hidden type bugs internally
- **Risk**: Low - assertions are only removed once TypeScript validates the types

## Benefits

1. **Type Safety**: Catch type errors at compile time instead of runtime
2. **Better IDE Support**: Improved autocompletion and type inference
3. **Maintainability**: Changes that break type contracts are caught immediately
4. **Documentation**: Types serve as living documentation of constraints
5. **Refactoring Confidence**: Safe refactoring with TypeScript's help
6. **Bug Prevention**: The current assertions could be masking real bugs where incompatible types are returned

## Example

**Before (current):**
```typescript
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : 
  min === max ? new ArbitraryConstant(min) as unknown as Arbitrary<number> : 
  new ArbitraryInteger(min, max) as unknown as Arbitrary<number>
```

**After (proposed):**
```typescript
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => {
  if (min > max) return NoArbitrary;
  if (min === max) return new ArbitraryConstant(min);
  return new ArbitraryInteger(min, max);
};
```

## Success Criteria

1. Zero `as unknown as` assertions in arbitrary factory functions
2. Full strict mode enabled (`strict: true`)
3. All tests pass
4. No new TypeScript errors
5. Type inference works correctly for all public API functions

## Related Changes

- **`ts-modernise-strict-mode`**: Enables full strict mode. Phase 2 of this proposal overlaps - consider implementing strict mode first via that proposal, then continuing with phases 3-4 here.

## Notes

- The `satisfies` operator (TS 4.9+) could help in some cases but doesn't solve the core `NoArbitrary` unification issue
- Consider adding ESLint rule `@typescript-eslint/no-unnecessary-type-assertion` after completion
- No `as any` assertions currently exist in the codebase ✅
