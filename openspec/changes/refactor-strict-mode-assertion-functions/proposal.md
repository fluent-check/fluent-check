# Change: Adopt Assertion Functions for Type Narrowing

> **GitHub Issue:** [#480](https://github.com/fluent-check/fluent-check/issues/480)

## Why

When runtime validation is necessary (e.g., user input, external data, bounds checking), TypeScript assertion functions (`asserts x is T`) provide automatic type narrowing with clear error messages. Currently, validation is done with manual `if` checks that narrow types but add noise and don't provide reusable validation helpers.

**Current Problem:**
- Validation logic is scattered with manual `if (x === undefined)` checks
- Type narrowing happens but requires repeated checks
- No reusable validation helpers with automatic type narrowing
- Error messages are inconsistent or missing

**Solution:**
Use TypeScript assertion functions to create reusable validation helpers that automatically narrow types and provide clear error messages. Validate once, let the type system handle the rest.

## What Changes

### Assertion Functions Pattern

1. **Create Assertion Function Helpers** - Reusable validation with automatic type narrowing:
   ```typescript
   function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
     if (value === undefined) {
       throw new Error(message)
     }
   }
   ```

2. **Bounds Validation** - Assert array/object bounds:
   ```typescript
   function assertInBounds(index: number, length: number): asserts index is number {
     if (index < 0 || index >= length) {
       throw new Error(`Index ${index} out of bounds for length ${length}`)
     }
   }
   ```

3. **Schema Validation** - Assert record/schema completeness:
   ```typescript
   function assertSchemaValid<T extends Record<string, unknown>>(
     schema: Partial<T>,
     requiredKeys: (keyof T)[]
   ): asserts schema is Required<Pick<T, keyof T>> {
     for (const key of requiredKeys) {
       if (schema[key] === undefined) {
         throw new Error(`Schema missing required key: ${String(key)}`)
       }
     }
   }
   ```

4. **Use in Constructors and Initialization** - Validate at construction, narrow types automatically

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryComposite.ts:32`** - Array access without bounds validation:
   ```typescript
   return this.arbitraries[weights.findIndex(s => s > picked)].pick(generator)
   ```
   **Problem:** `findIndex` can return `-1`, array access could be undefined
   **Solution:** Validate bounds, use assertion function, then access safely

2. **`src/arbitraries/ArbitraryTuple.ts:66-68`** - Manual undefined checks:
   ```typescript
   for (const i in value) {
     const index = Number(i)
     if (!this.arbitraries[index].canGenerate(...))
   ```
   **Problem:** `arbitraries[index]` could be undefined, no validation
   **Solution:** Use assertion function for bounds, or use array methods

3. **Validation scattered** - Throughout codebase, validation logic is inline and not reusable

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator
- `@typescript-eslint/strict-boolean-expressions: 'error'` - Enforces strict boolean checks

**Proposed Changes:**
- **No changes needed** - Assertion functions are preferred over non-null assertions
- Assertion functions provide better error messages than `!` operator
- Consider documenting assertion function pattern in ESLint rule comments

**ESLint Rule Considerations:**
- Assertion functions work with existing type-checking rules
- Prefer assertion functions over non-null assertions (`!`) when validation is needed
- Assertion functions provide runtime validation with type narrowing

### Related Techniques

This pattern works synergistically with:
1. **Type-Level Utility Types** - Assertion functions can return `NonNullable<T>` types
2. **Mapped Types for Validated Structures** - Assertion functions can validate and return mapped type transformations
3. **Validate Once, Assert Safely** - Assertion functions enable validate-once pattern
4. **Early Validation** - Assertion functions work well at function start for fail-fast validation

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryComposite.ts` - Bounds validation
  - `src/arbitraries/ArbitraryTuple.ts` - Array access validation
  - `src/arbitraries/ArbitraryRecord.ts` - Schema validation
  - Any function that validates bounds, existence, or structure
- **Breaking:** No runtime behavior changes, improves error messages
- **Performance:** Minimal runtime overhead (validation that was already happening)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with assertion function examples
