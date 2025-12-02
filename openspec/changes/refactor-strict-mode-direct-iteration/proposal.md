# Change: Adopt Direct Iteration Over for...in Loops

> **GitHub Issue:** [#486](https://github.com/fluent-check/fluent-check/issues/486)

## Why

`for...in` loops with `Number()` conversion for array indices are verbose and error-prone. Direct iteration with `for...of` and indices, or `entries()`, provides clearer intent and better type safety.

**Current Problem:**
- `for...in` loops require `Number()` conversion for array indices
- Less clear intent than direct iteration
- Potential for string/number confusion
- Verbose compared to `for...of` with indices

**Solution:**
Replace `for...in` loops with `for...of` and indices, or use `entries()` for key-value iteration, providing clearer intent and better type safety.

## What Changes

### Direct Iteration Pattern

1. **`for...of` with Indices** - For array iteration:
   ```typescript
   // Before
   for (const i in value) {
     const index = Number(i)
     // ...
   }
   
   // After
   for (let i = 0; i < value.length; i++) {
     // ...
   }
   ```

2. **`entries()` for Key-Value Iteration** - For object iteration:
   ```typescript
   // Before
   for (const k in obj) {
     const key = k
     const value = obj[k]
   }
   
   // After
   for (const [key, value] of Object.entries(obj)) {
     // ...
   }
   ```

3. **`keys()` for Key Iteration** - When only keys are needed:
   ```typescript
   for (const key of Object.keys(obj)) {
     // ...
   }
   ```

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryTuple.ts:66`** - `for...in` with `Number()` conversion:
   ```typescript
   for (const i in value) {
     const index = Number(i)
     // ...
   }
   ```
   **Solution:** Use `for (let i = 0; i < value.length; i++)` or `every()` with indices

2. **`src/arbitraries/Arbitrary.ts:52`** - `for...in` on object:
   ```typescript
   for (const k in cornerCases)
   ```
   **Solution:** Use `Object.entries()` or `Object.keys()`

3. **`src/FluentCheck.ts:269`** - `for...in` on object:
   ```typescript
   for (const k in testCase) result[k] = testCase[k].value
   ```
   **Solution:** Use `Object.entries()` for key-value iteration

### Impact on ESLint Configuration

**Current ESLint Rules:**
- No specific rule for `for...in` vs `for...of` (general best practice)

**Proposed Changes:**
- **No changes needed** - Direct iteration is standard JavaScript/TypeScript
- Consider documenting pattern in ESLint rule comments
- No new rules needed (preference, not requirement)

**ESLint Rule Considerations:**
- `for...of` is preferred for arrays (standard practice)
- `Object.entries()` is preferred for object iteration (standard practice)
- No new linting issues expected

### Related Techniques

This pattern works synergistically with:
1. **Array Methods** - `every()`, `some()`, `filter()` are alternatives to `for...of` loops
2. **Type-Level Utility Types** - Direct iteration works well with type narrowing
3. **Validate Once, Assert Safely** - Direct iteration with validated bounds

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryTuple.ts` - Array iteration
  - `src/arbitraries/Arbitrary.ts` - Object iteration
  - `src/FluentCheck.ts` - Object iteration
  - Any `for...in` loops with array/object access
- **Breaking:** No runtime behavior changes, purely refactoring for readability
- **Performance:** No performance impact (equivalent code)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with direct iteration examples
