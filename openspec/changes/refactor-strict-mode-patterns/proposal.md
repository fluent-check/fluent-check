# Change: Adopt Clean Patterns for Strict Mode Type Safety

## Why
After enabling full TypeScript strict mode (`noUncheckedIndexedAccess: true`), the codebase was updated with defensive `if (x === undefined)` checks throughout. While these maintain type safety, they make the code noisy and harder to read, and add unnecessary runtime overhead. We should establish and adopt cleaner patterns that maintain strict type safety while improving code clarity and maintainability across the entire codebase.

**Core Principle: ALWAYS prefer type-level solutions over runtime validation.** Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks should only be used when type-level solutions are not feasible.

## What Changes

**Priority Order: Type-Level Solutions First, Runtime Checks Last**

### Type-Level Patterns (PREFERRED - Zero Runtime Overhead)
- **Pattern: Type-Level Utility Types** - Use TypeScript utility types (`NonNullable<T>`, `Required<T>`, `Exclude<T, undefined>`, `Extract<T, U>`) to express non-nullable types at the type level, eliminating runtime checks entirely
- **Pattern: Mapped Types for Validated Structures** - Use mapped types and conditional types to transform optional types to required types when structure is validated, expressing validation state in types
- **Pattern: Assertion Functions** - Use TypeScript assertion functions (`asserts x is T`) for type narrowing in validation helpers, validating once and letting types handle the rest

### Runtime Patterns (When Type-Level Not Feasible)
- **Pattern: Array Methods Over Manual Iteration** - Prefer `every()`, `some()`, `filter()`, `slice()`, and other array methods that handle undefined naturally over `for...in` loops with explicit undefined checks
- **Pattern: Validate Once, Assert Safely** - When runtime validation is necessary, validate bounds/validity upfront, then use non-null assertions (`!`) after validation instead of repeated undefined checks
- **Pattern: Early Validation** - Move preconditions and validation to the start of functions to fail fast and reduce nested checks
- **Pattern: Nullish Coalescing for Defaults** - Use `??` operator for default values instead of explicit `if (x === undefined)` checks
- **Pattern: Known Data Structures** - When controlling data structures (e.g., schema keys), validate at construction/initialization, then use type-level transformations to express validated state
- **Pattern: Type Guard Helpers** - Extract common validation logic into reusable type guard functions (prefer assertion functions)
- **Pattern: Optional Chaining** - Use `?.` and `??` for nested optional access patterns
- **Pattern: Direct Iteration** - Prefer `for...of` with indices or `entries()` over `for...in` with `Number()` conversion

- Apply these patterns systematically across all files with defensive undefined checks, prioritizing type-level solutions
- Document patterns in `docs/patterns/strict-mode-patterns.md` with clear priority ordering

## Impact
- Affected specs: None (refactoring for code quality)
- Affected code: All files with defensive undefined checks from strict mode, including but not limited to:
  - `src/arbitraries/**/*.ts`
  - `src/FluentCheck.ts`
  - `src/FluentProperty.ts`
  - `src/strategies/**/*.ts`
  - `src/statistics.ts`
  - Any other files with array/object index access patterns
- Breaking: No runtime behavior changes, purely refactoring for readability and maintainability
- Documentation: Adds `docs/patterns/strict-mode-patterns.md` and `docs/patterns/strict-mode-refactoring-examples.md` as project-wide guidelines
