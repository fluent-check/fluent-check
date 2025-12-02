# Change: Adopt Nullish Coalescing for Defaults

> **GitHub Issue:** [#484](https://github.com/fluent-check/fluent-check/issues/484)

## Why

Many functions use explicit `if (x === undefined)` checks to provide default values. The nullish coalescing operator (`??`) and nullish coalescing assignment (`??=`) provide a more concise and idiomatic way to handle defaults, reducing code noise.

**Current Problem:**
- Verbose `if (x === undefined) { return default }` patterns
- Repeated default value logic
- Less readable than nullish coalescing
- Inconsistent default handling patterns

**Solution:**
Use `??` operator for default values and `??=` for assignment defaults, replacing explicit undefined checks with more concise syntax.

## What Changes

### Nullish Coalescing Pattern

1. **Default Values** - Use `??` for defaults:
   ```typescript
   // Before
   if (part === undefined) {
     return default
   }
   
   // After
   const value = part ?? default
   ```

2. **Assignment Defaults** - Use `??=` for assignment:
   ```typescript
   // Before
   if (x === undefined) {
     x = default
   }
   
   // After
   x ??= default
   ```

3. **Nested Defaults** - Chain `??` for multiple defaults:
   ```typescript
   const value = first ?? second ?? third ?? finalDefault
   ```

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/string.ts:12`** - Explicit undefined check:
   ```typescript
   if (start === undefined) return charArb()
   ```
   **Solution:** Use `??` operator: `const startValue = start ?? 0`

2. **`src/arbitraries/regex.ts`** - Range parts with undefined checks:
   ```typescript
   const part = rangeParts[0]
   if (part === undefined) {
     return {min: 1, max: 1, nextIndex: closeBrace + 1}
   }
   ```
   **Solution:** Use `??` operator: `const part = rangeParts[0] ?? ''`

3. **Default value patterns** - Throughout codebase, explicit undefined checks for defaults

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/prefer-nullish-coalescing: 'error'` - Already enforces `??` over `||`

**Proposed Changes:**
- **No changes needed** - ESLint already enforces nullish coalescing
- Rule already encourages `??` over `||` for defaults
- Verify rule is enabled and working correctly

**ESLint Rule Considerations:**
- `@typescript-eslint/prefer-nullish-coalescing` should catch cases where `||` is used instead of `??`
- Rule should encourage `??` for undefined/null defaults
- No new rules needed

### Related Techniques

This pattern works synergistically with:
1. **Array Methods** - `at()` with `??` for safe array access with defaults
2. **Optional Chaining** - `?.` with `??` for nested optional access with defaults
3. **Early Validation** - Use `??` for defaults before validation
4. **Type-Level Utility Types** - `??` works well with `NonNullable<T>` types

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/string.ts` - Default value handling
  - `src/arbitraries/regex.ts` - Range part defaults
  - Any function with explicit undefined checks for defaults
- **Breaking:** No runtime behavior changes, purely syntax improvement
- **Performance:** No performance impact (equivalent code)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with nullish coalescing examples
