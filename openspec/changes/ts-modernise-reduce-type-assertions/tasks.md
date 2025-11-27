# Tasks: Reduce Type Assertions

## 1. Investigation & Baseline

- [x] 1.1 Run `tsc --noEmit` to capture current state (should pass)
- [x] 1.2 Document all 14 `as unknown as` assertion locations:
  - `src/arbitraries/index.ts`: lines 21, 24, 30, 33, 41, 44, 48, 53
  - `src/arbitraries/regex.ts`: lines 11, 13, 16, 19, 24
  - `src/arbitraries/ArbitraryTuple.ts`: line 57
- [x] 1.3 Test if simply removing assertions causes compile errors (document which ones)
- [x] 1.4 Analyze why `Arbitrary<never>` (NoArbitrary) doesn't unify with `Arbitrary<T>`

## 2. Enable Full Strict Mode

- [x] 2.1 Enable `strict: true` in `tsconfig.json`
- [x] 2.2 Remove redundant individual strict flags (now implied by `strict: true`)
- [x] 2.3 Fix any new errors that surface from strict mode
- [x] 2.4 Run tests to ensure no regressions

## 3. Fix NoArbitrary Pattern

- [x] 3.1 Evaluate options:
  - Option A: Generic `noArbitrary<T>()` factory function
  - Option B: Explicit if-statement bodies (avoids ternary inference issues) ✅ **Chosen**
  - Option C: Explicit return type annotations on factory functions
- [x] 3.2 Implement chosen solution in `src/arbitraries/NoArbitrary.ts` (if needed)
  - No changes needed - Option B works with existing NoArbitrary
- [x] 3.3 Update `src/arbitraries/internal.ts` exports (if needed)
  - No changes needed

## 4. Remove Assertions - index.ts (9 instances)

- [x] 4.1 Fix `integer()` function (line 21) - 2 assertions → refactored to if-statements
- [x] 4.2 Fix `real()` function (line 24) - 2 assertions → refactored to if-statements
- [x] 4.3 Fix `array()` function (line 30) - 1 assertion → refactored to if-statements
- [x] 4.4 Fix `set()` function (line 33) - 1 assertion → refactored to if-statements
- [x] 4.5 Fix `union()` function (line 41) - 1 assertion → refactored with filtered variable
- [x] 4.6 Fix `boolean()` function (line 44) - 1 assertion → removed, direct return
- [x] 4.7 Fix `constant()` function (line 48) - 1 assertion → removed, direct return
- [x] 4.8 Fix `tuple()` function (line 53) - 1 assertion → reduced to simple `as Arbitrary<>` cast

## 5. Remove Assertions - regex.ts (5 instances)

- [x] 5.1 Fix local `integer()` function (line 11) - 2 assertions → refactored to if-statements
- [x] 5.2 Fix local `constant()` function (line 13) - 1 assertion → removed, direct return
- [x] 5.3 Fix local `array()` function (line 16) - 1 assertion → refactored to if-statements
- [x] 5.4 Fix local `tuple()` function (line 19) - 1 assertion → removed, direct return
- [x] 5.5 Fix local `union()` function (line 24) - 1 assertion → refactored with filtered variable
- [x] 5.6 Consider: refactor to use exported functions from `index.ts` instead of duplicating
  - Kept local implementations to avoid circular dependencies (documented in comments)

## 6. Remove Assertions - ArbitraryTuple.ts (1 instance)

- [x] 6.1 Fix `shrink()` method (line 57) - analyze recursive type inference issue
  - Reduced to simple `as Arbitrary<A>` cast (not `as unknown as`)
- [x] 6.2 May require explicit type annotation on the fc.union/fc.tuple chain
  - Used `as unknown[]` for value/original arrays to enable indexing

## 7. Verification & Cleanup

- [x] 7.1 Run `tsc --noEmit` - must pass with zero errors
- [x] 7.2 Run full test suite (`npm test`) - must pass (125 tests passing)
- [x] 7.3 Grep for remaining `as unknown as` - **zero found** ✅
- [x] 7.4 Grep for `as any` - **zero found** ✅
- [ ] 7.5 Consider adding ESLint rule: `@typescript-eslint/no-unnecessary-type-assertion`
  - Deferred to future enhancement

## 8. Documentation

- [x] 8.1 Update any inline comments explaining type patterns
  - Kept existing comment about circular dependencies in regex.ts
- [x] 8.2 Document the NoArbitrary pattern in code if non-obvious
  - Pattern is now self-explanatory with explicit if-statements

## Additional Changes

- [x] Added `jstat.d.ts` type declarations for the jstat module (required for strict mode)
- [x] Fixed strict mode errors in FluentCheck.ts (indexing issues)
- [x] Fixed strict mode errors in ArbitraryTuple.ts (unknown[] indexing)
- [x] Updated charClassMap type in regex.ts from `Record<CharClassKey, ...>` to `Record<string, ...>` for string indexing

## Notes

- All 14 `as unknown as` assertions have been eliminated
- 2 simple `as Arbitrary<T>` casts remain (type-safe, not bypassing type checking):
  - `index.ts:65` - ArbitraryTuple cast for UnwrapFluentPick
  - `ArbitraryTuple.ts:59` - shrink method return type
- Full strict mode (`strict: true`) is now enabled
- All 125 tests pass
