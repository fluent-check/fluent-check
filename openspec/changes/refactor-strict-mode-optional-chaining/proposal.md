# Change: Adopt Optional Chaining for Nested Access

> **GitHub Issue:** [#485](https://github.com/fluent-check/fluent-check/issues/485)

## Why

Nested optional property access often requires multiple `if` checks to avoid runtime errors. Optional chaining (`?.`) and nullish coalescing (`??`) provide a concise way to safely access nested optional properties, reducing code noise and improving readability.

**Current Problem:**
- Nested `if` checks for optional property access
- Verbose code for accessing optional nested properties
- Less readable than optional chaining
- Inconsistent optional access patterns

**Solution:**
Use `?.` operator for optional property access and `??` for defaults, replacing nested `if` checks with more concise syntax.

## What Changes

### Optional Chaining Pattern

1. **Optional Property Access** - Use `?.` for safe access:
   ```typescript
   // Before
   if (obj !== undefined && obj.prop !== undefined) {
     return obj.prop.value
   }
   
   // After
   return obj?.prop?.value
   ```

2. **Optional Method Calls** - Use `?.` for optional methods:
   ```typescript
   // Before
   if (obj !== undefined && obj.method !== undefined) {
     return obj.method()
   }
   
   // After
   return obj?.method?.()
   ```

3. **Optional Chaining with Defaults** - Combine `?.` with `??`:
   ```typescript
   const value = obj?.prop?.value ?? defaultValue
   ```

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/regex.ts:284`** - Nested optional access:
   ```typescript
   if (charClassMap[escapeSeq] !== undefined) {
     charClasses.push(createCharClass(charClassMap[escapeSeq], quantifier))
   }
   ```
   **Solution:** Use optional chaining: `const arbitrary = charClassMap[escapeSeq]?.`

2. **Nested property access patterns** - Throughout codebase, nested `if` checks for optional properties

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/prefer-optional-chain: 'error'` - Already enforces `?.` over `&&` chains

**Proposed Changes:**
- **No changes needed** - ESLint already enforces optional chaining
- Rule already encourages `?.` over `&&` chains for optional access
- Verify rule is enabled and working correctly

**ESLint Rule Considerations:**
- `@typescript-eslint/prefer-optional-chain` should catch cases where `&&` is used instead of `?.`
- Rule should encourage `?.` for optional property/method access
- No new rules needed

### Related Techniques

This pattern works synergistically with:
1. **Nullish Coalescing** - `?.` with `??` for optional access with defaults
2. **Array Methods** - `at()` with `?.` for safe array access
3. **Type-Level Utility Types** - `?.` works well with `NonNullable<T>` types

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/regex.ts` - Optional property access
  - Any nested optional property access patterns
- **Breaking:** No runtime behavior changes, purely syntax improvement
- **Performance:** No performance impact (equivalent code)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with optional chaining examples
