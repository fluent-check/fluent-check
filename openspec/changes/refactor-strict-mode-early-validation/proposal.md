# Change: Adopt Early Validation Pattern

> **GitHub Issue:** [#483](https://github.com/fluent-check/fluent-check/issues/483)

## Why

Validation and preconditions should happen at the start of functions to fail fast and reduce nested checks. Moving validation to the beginning of functions improves error messages, reduces nesting, and makes code flow clearer.

**Current Problem:**
- Validation happens mid-function, creating nested code
- Error messages appear late in execution
- Code flow is harder to follow with scattered validation
- Preconditions are checked after some computation

**Solution:**
Move all validation and preconditions to the start of functions (fail fast), then proceed with the main logic. This pattern improves error messages, reduces nesting, and makes code flow clearer.

## What Changes

### Early Validation Pattern

1. **Fail Fast** - Validate at function start:
   ```typescript
   // Before
   function process(data: T[]) {
     const result = compute(data)
     if (data.length === 0) {
       throw new Error('Data required')
     }
     // ...
   }
   
   // After
   function process(data: T[]) {
     if (data.length === 0) {
       throw new Error('Data required')
     }
     const result = compute(data)
     // ...
   }
   ```

2. **Precondition Checks** - Check preconditions first:
   - Validate bounds before array access
   - Validate existence before property access
   - Validate structure before processing

3. **Clear Error Messages** - Fail fast with descriptive errors:
   - Error messages appear immediately
   - Easier to debug when validation fails early

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryComposite.ts:25-32`** - No upfront validation:
   ```typescript
   override pick(generator: () => number) {
     const weights = this.arbitraries.reduce(...)
     // ... computation ...
     return this.arbitraries[weights.findIndex(...)].pick(generator)
   }
   ```
   **Problem:** No validation that `arbitraries` is non-empty before computation
   **Solution:** Validate at start: `if (this.arbitraries.length === 0) throw ...`

2. **Functions with mid-function validation** - Throughout codebase, validation happens after some computation

### Impact on ESLint Configuration

**Current ESLint Rules:**
- No specific rule for early validation (general best practice)

**Proposed Changes:**
- **No changes needed** - Early validation is a best practice, not a linting rule
- Consider documenting pattern in code comments
- No new rules needed

**ESLint Rule Considerations:**
- Early validation is a code organization pattern
- Works well with assertion functions
- No new linting issues expected

### Related Techniques

This pattern works synergistically with:
1. **Validate Once, Assert Safely** - Validate early, then assert safely
2. **Assertion Functions** - Assertion functions work well at function start
3. **Known Data Structures** - Validate at construction, then use early validation in methods

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryComposite.ts` - Precondition validation
  - Any function with validation after computation
- **Breaking:** No runtime behavior changes, improves error messages
- **Performance:** Slight improvement (fail fast, no wasted computation)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with early validation examples
