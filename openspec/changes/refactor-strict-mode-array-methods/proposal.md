# Change: Adopt Array Methods Over Manual Iteration

> **GitHub Issue:** [#481](https://github.com/fluent-check/fluent-check/issues/481)

## Why

After enabling `noUncheckedIndexedAccess: true`, many `for...in` loops were added with explicit undefined checks. However, array methods like `every()`, `some()`, `filter()`, `slice()`, and `at()` handle undefined naturally and are more idiomatic, reducing code noise and improving readability.

**Current Problem:**
- `for...in` loops with `Number()` conversion and explicit undefined checks
- Manual iteration with verbose undefined handling
- Less declarative code that's harder to read and maintain
- Repeated patterns that could use built-in array methods

**Solution:**
Replace `for...in` loops and manual iteration with declarative array methods that handle undefined naturally and work well with type guards.

## What Changes

### Array Methods Pattern

1. **`every()` and `some()`** - For validation/checking operations:
   - Replace `for...in` loops that check all/some elements
   - Handle undefined naturally in predicates
   - More declarative and readable

2. **`filter()` with Inferred Type Predicates (TypeScript 5.5+)** - For filtering undefined values:
   - **TypeScript 5.5 automatically infers type predicates** - `filter(item => item !== undefined)` returns `NonNullable<T>[]` without explicit type guard!
   - No need for explicit `(item): item is NonNullable<T>` - TypeScript infers it
   - Return `NonNullable<T>[]` types automatically
   - Eliminate manual undefined checks and type assertions

3. **`slice()`** - For bounds-safe array access:
   - Automatically handles out-of-bounds indices
   - Returns empty array for invalid ranges
   - Eliminates manual bounds checking

4. **`at()` with Nullish Coalescing** - For safe indexed access:
   - Returns `T | undefined` naturally
   - Use `??` for defaults
   - More explicit than manual index access

5. **`findIndex()` and `find()`** - For searching operations:
   - Handle undefined naturally
   - Return `-1` or `undefined` for not found
   - More idiomatic than manual loops

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryTuple.ts:66-70`** - `for...in` loop with manual checks:
   ```typescript
   for (const i in value) {
     const index = Number(i)
     if (!this.arbitraries[index].canGenerate({value: value[index], original: original[index]}))
       return false
   }
   ```
   **Problem:** `for...in` with `Number()` conversion, no bounds validation, verbose
   **Solution:** Use `every()` with proper indexing: `this.arbitraries.every((arbitrary, i) => ...)`

2. **`src/arbitraries/Arbitrary.ts:52`** - `for...in` loop:
   ```typescript
   for (const k in cornerCases)
   ```
   **Problem:** `for...in` on object, could use `Object.entries()` or `Object.keys()`
   **Solution:** Use `Object.entries()` for key-value iteration

3. **`src/FluentCheck.ts:269`** - `for...in` loop:
   ```typescript
   for (const k in testCase) result[k] = testCase[k].value
   ```
   **Problem:** `for...in` on object, could use `Object.entries()`
   **Solution:** Use `Object.entries()` for cleaner iteration

4. **Array filtering patterns** - Manual loops with undefined checks instead of `filter()`

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator
- `@typescript-eslint/strict-boolean-expressions: 'error'` - Enforces strict boolean checks

**Proposed Changes:**
- **No changes needed** - Array methods are standard JavaScript/TypeScript
- Consider enabling `prefer-array-methods` style rules if available
- Array methods work well with existing type-checking rules

**ESLint Rule Considerations:**
- `@typescript-eslint/prefer-nullish-coalescing` - Already encourages `??` with `at()`
- Array methods complement existing rules by providing idiomatic patterns
- No new linting issues expected

### Modern TypeScript 5.5+ Features

**TypeScript 5.5 Inferred Type Predicates:**
- `filter(item => item !== undefined)` automatically infers `NonNullable<T>[]` - no explicit type guard needed!
- `filter(item => item !== null)` automatically infers `Exclude<T, null>[]`
- Works with any truthiness check that TypeScript can infer as a type predicate

**TypeScript 5.5 Control Flow Narrowing:**
- After bounds checks, constant indexed accesses are automatically narrowed
- `if (index >= 0 && index < array.length) { array[index] }` - type is automatically `T`, not `T | undefined`

**TypeScript 5.4 Preserved Narrowing in Closures:**
- Type narrowing is preserved in closures after the last assignment
- No need for `!` operator in callbacks when type is narrowed before closure

### Related Techniques

This pattern works synergistically with:
1. **Type-Level Utility Types** - `filter()` with inferred type predicates returns `NonNullable<T>[]` automatically (TS 5.5+)
2. **Validate Once, Assert Safely** - `slice()` and bounds validation work together, TypeScript 5.5 narrows types automatically
3. **Nullish Coalescing** - `at()` with `??` for safe access with defaults
4. **Direct Iteration** - `for...of` with indices instead of `for...in`

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryTuple.ts` - `canGenerate()` method
  - `src/arbitraries/Arbitrary.ts` - `cornerCases()` method
  - `src/FluentCheck.ts` - Test case processing
  - Any `for...in` loops with array/object access
- **Breaking:** No runtime behavior changes, purely refactoring for readability
- **Performance:** Array methods are optimized and often faster than manual loops
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with array method examples
