# Change: Adopt Known Data Structures Pattern

> **GitHub Issue:** [#487](https://github.com/fluent-check/fluent-check/issues/487)

## Why

When the codebase controls data structures (e.g., schemas, configurations), validation should happen at construction/initialization, then type-level transformations should express the validated state. This eliminates runtime checks throughout the object's lifetime.

**Current Problem:**
- Data structures are validated but types don't reflect validation state
- Runtime checks are needed even after validation
- Validation state is not expressed in the type system
- Repeated checks for structures that are known to be valid

**Solution:**
Validate data structures at construction/initialization, then use type-level transformations (mapped types, `Required<T>`) to express validated state. Store validated structures with transformed types to eliminate runtime checks.

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryRecord.ts:12-14`** - Schema validated but type remains optional:
   ```typescript
   constructor(public readonly schema: S) {
     super()
     this.#keys = Object.keys(schema) as (keyof S)[]
     // Schema could have undefined values, but we control it
   }
   ```
   **Problem:** Every access to `this.schema[key]` could be undefined, requiring checks
   **Solution:** Validate at construction, store as `ValidatedSchema<S>`, eliminate checks

2. **Schema/Configuration Patterns** - Throughout codebase, structures are controlled but not validated at construction

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator

**Proposed Changes:**
- **No changes needed** - Known data structures use type-level transformations
- Type-level transformations eliminate need for non-null assertions
- Consider documenting pattern in ESLint rule comments

**ESLint Rule Considerations:**
- Known data structures work with existing type-checking rules
- Type-level transformations provide compile-time guarantees
- No new linting issues expected

### Related Techniques

This pattern works synergistically with:
1. **Mapped Types for Validated Structures** - Use mapped types to express validated state
2. **Type-Level Utility Types** - Use `Required<T>` and `NonNullable<T>` for validated structures
3. **Assertion Functions** - Assertion functions can validate at construction
4. **Validate Once, Assert Safely** - Validate at construction, then assert safely in methods

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryRecord.ts` - Schema validation at construction
  - Any class that controls data structures (schemas, configs)
- **Breaking:** No runtime behavior changes, purely type-level improvements
- **Performance:** Zero runtime overhead after construction (compile-time only)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with known structures examples
