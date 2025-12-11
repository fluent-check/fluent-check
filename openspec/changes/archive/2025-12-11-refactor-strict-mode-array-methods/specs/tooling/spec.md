# Tooling

## ADDED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Array iteration with undefined handling
- **WHEN** iterating over arrays with potential undefined values
- **THEN** code SHALL use array methods (`every()`, `some()`, `filter()`, `slice()`) that handle undefined naturally
- **AND** code SHALL avoid verbose `for...in` loops with explicit undefined checks
- **AND** code SHALL prefer declarative array methods over imperative loops
- **AND** code SHALL use TypeScript 5.5 inferred type predicates with `filter()` - `filter(item => item !== undefined)` automatically infers `NonNullable<T>[]` without explicit type guard
- **AND** code SHALL use `slice()` for bounds-safe array access when appropriate

#### Scenario: Array index access with validated bounds
- **WHEN** accessing array elements where bounds can be validated
- **THEN** code SHALL validate bounds upfront at function start or construction
- **AND** code SHALL leverage TypeScript 5.5 control flow narrowing - after bounds check, constant indexed accesses are automatically narrowed to `T` (not `T | undefined`)
- **AND** code SHALL avoid non-null assertions (`!`) when TypeScript 5.5+ type inference can handle the case
- **AND** code SHALL avoid redundant undefined checks after validation
- **AND** code SHALL use `at()` method with nullish coalescing for safe access when bounds are unknown

#### Scenario: Object iteration patterns
- **WHEN** iterating over object properties
- **THEN** code SHALL use `Object.entries()` for key-value iteration
- **AND** code SHALL avoid `for...in` loops when `Object.entries()` is more appropriate
- **AND** code SHALL use `Object.keys()` when only keys are needed
- **AND** code SHALL use array methods on object entries when appropriate
