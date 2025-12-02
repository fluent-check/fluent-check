# Change: Adopt Mapped Types for Validated Structures

> **GitHub Issue:** [#479](https://github.com/fluent-check/fluent-check/issues/479)

## Why

When data structures (like schemas, configurations, or records) are validated at construction or initialization, the TypeScript type system should reflect that validation state. Currently, even after validation, types remain optional (`Record<K, T | undefined>`), requiring repeated runtime checks throughout the codebase.

**Current Problem:**
- `ArbitraryRecord` validates schema at construction but type remains `Record<string, Arbitrary<unknown> | undefined>`
- Every access to `schema[key]` requires runtime undefined checks
- Validation state is not expressed in the type system
- Repeated runtime checks add overhead and noise

**Solution:**
Use mapped types and conditional types to transform optional types to required types after validation, expressing validation state in the type system with zero runtime overhead after initial validation.

## What Changes

### Mapped Types for Validated Structures

1. **Validated Schema Pattern** - Transform `Record<K, T | undefined>` to `Record<K, T>` after validation:
   ```typescript
   type ValidatedSchema<T extends Record<string, Arbitrary<unknown> | undefined>> = {
     [K in keyof T]-?: NonNullable<T[K]>
   }
   ```

2. **Conditional Type Transformations** - Use conditional types to express validation state:
   - Transform optional properties to required after validation
   - Express "all keys present" constraint in types
   - Create type-level representations of validated data structures

3. **Store Validated Structures** - Store validated structures with transformed types:
   - Validate once at construction/initialization
   - Store with transformed type (`ValidatedSchema<T>`)
   - Eliminate runtime checks for validated properties

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

2. **Schema Access Patterns** - Throughout `ArbitraryRecord`, schema access requires runtime checks:
   ```typescript
   for (const key of this.#keys) {
     const arbitrary = this.schema[key]  // Type: Arbitrary<unknown> | undefined
     // Would need: if (arbitrary === undefined) continue
   }
   ```
   **Solution:** Use mapped type to express validated state, store validated schema

3. **Record Types** - Any `Record<K, T | undefined>` that is validated should use mapped types

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator
- `@typescript-eslint/strict-boolean-expressions: 'error'` - Enforces strict boolean checks

**Proposed Changes:**
- **No changes needed** - Mapped types are compile-time only
- Mapped types actually **reduce** the need for non-null assertions by expressing constraints in types
- After validation, properties are guaranteed non-nullable in the type system

**ESLint Rule Considerations:**
- Mapped types work with existing type-checking rules
- No runtime assertions needed when types express validation state
- Consider documenting pattern in ESLint rule comments where mapped types are used

### Related Techniques

This pattern works synergistically with:
1. **Type-Level Utility Types** - Use `NonNullable<T>` and `Required<T>` within mapped types
2. **Assertion Functions** - Assertion functions can validate and return mapped type transformations
3. **Known Data Structures** - Validate at construction, then use mapped types to express validated state
4. **Validate Once, Assert Safely** - Validate once, then use mapped types to eliminate subsequent checks

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryRecord.ts` - Schema validation and access patterns
  - Any class/function that validates record/schema structures
  - Configuration objects that are validated at initialization
- **Breaking:** No runtime behavior changes, purely type-level improvements
- **Performance:** Zero runtime overhead after initial validation (compile-time only)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with mapped type examples
