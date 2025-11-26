# Tasks: Reduce Type Assertions

## 1. Investigation & Baseline

- [ ] 1.1 Run `tsc --noEmit` to capture current state (should pass)
- [ ] 1.2 Document all 14 `as unknown as` assertion locations:
  - `src/arbitraries/index.ts`: lines 21, 24, 30, 33, 41, 44, 48, 53
  - `src/arbitraries/regex.ts`: lines 11, 13, 16, 19, 24
  - `src/arbitraries/ArbitraryTuple.ts`: line 57
- [ ] 1.3 Test if simply removing assertions causes compile errors (document which ones)
- [ ] 1.4 Analyze why `Arbitrary<never>` (NoArbitrary) doesn't unify with `Arbitrary<T>`

## 2. Enable Full Strict Mode

- [ ] 2.1 Enable `strict: true` in `tsconfig.json`
- [ ] 2.2 Remove redundant individual strict flags (now implied by `strict: true`)
- [ ] 2.3 Fix any new errors that surface from strict mode
- [ ] 2.4 Run tests to ensure no regressions

## 3. Fix NoArbitrary Pattern

- [ ] 3.1 Evaluate options:
  - Option A: Generic `noArbitrary<T>()` factory function
  - Option B: Explicit if-statement bodies (avoids ternary inference issues)
  - Option C: Explicit return type annotations on factory functions
- [ ] 3.2 Implement chosen solution in `src/arbitraries/NoArbitrary.ts` (if needed)
- [ ] 3.3 Update `src/arbitraries/internal.ts` exports (if needed)

## 4. Remove Assertions - index.ts (9 instances)

- [ ] 4.1 Fix `integer()` function (line 21) - 2 assertions
- [ ] 4.2 Fix `real()` function (line 24) - 2 assertions
- [ ] 4.3 Fix `array()` function (line 30) - 1 assertion
- [ ] 4.4 Fix `set()` function (line 33) - 1 assertion
- [ ] 4.5 Fix `union()` function (line 41) - 1 assertion
- [ ] 4.6 Fix `boolean()` function (line 44) - 1 assertion
- [ ] 4.7 Fix `constant()` function (line 48) - 1 assertion
- [ ] 4.8 Fix `tuple()` function (line 53) - 1 assertion

## 5. Remove Assertions - regex.ts (5 instances)

- [ ] 5.1 Fix local `integer()` function (line 11) - 2 assertions
- [ ] 5.2 Fix local `constant()` function (line 13) - 1 assertion
- [ ] 5.3 Fix local `array()` function (line 16) - 1 assertion
- [ ] 5.4 Fix local `tuple()` function (line 19) - 1 assertion
- [ ] 5.5 Fix local `union()` function (line 24) - 1 assertion
- [ ] 5.6 Consider: refactor to use exported functions from `index.ts` instead of duplicating

## 6. Remove Assertions - ArbitraryTuple.ts (1 instance)

- [ ] 6.1 Fix `shrink()` method (line 57) - analyze recursive type inference issue
- [ ] 6.2 May require explicit type annotation on the fc.union/fc.tuple chain

## 7. Verification & Cleanup

- [ ] 7.1 Run `tsc --noEmit` - must pass with zero errors
- [ ] 7.2 Run full test suite (`npm test`) - must pass
- [ ] 7.3 Grep for remaining `as unknown as` - should be zero
- [ ] 7.4 Grep for `as any` - document if any exist (future cleanup candidate)
- [ ] 7.5 Consider adding ESLint rule: `@typescript-eslint/no-unnecessary-type-assertion`

## 8. Documentation

- [ ] 8.1 Update any inline comments explaining type patterns
- [ ] 8.2 Document the NoArbitrary pattern in code if non-obvious

## Notes

- Tasks in sections 4-6 can be done incrementally; each fix should be verified independently
- If a specific assertion cannot be removed without architectural changes, document why and consider if the architectural change is worth it
- The `regex.ts` local functions (section 5) may be candidates for refactoring to reuse `index.ts` exports
