# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Direct iteration patterns
- **WHEN** iterating over arrays or objects
- **THEN** code SHALL use `for...of` with indices for array iteration
- **AND** code SHALL use `Object.entries()` for key-value object iteration
- **AND** code SHALL use `Object.keys()` when only keys are needed
- **AND** code SHALL avoid `for...in` loops with `Number()` conversion for array indices
- **AND** code SHALL prefer array methods (`every()`, `some()`, `filter()`) when appropriate

#### Scenario: Array iteration with indices
- **WHEN** iterating over arrays with index access
- **THEN** code SHALL use `for (let i = 0; i < array.length; i++)` or array methods
- **AND** code SHALL avoid `for...in` loops with `Number()` conversion
- **AND** code SHALL use array methods when the operation is declarative (e.g., `every()`, `filter()`)

#### Scenario: Object iteration patterns
- **WHEN** iterating over object properties
- **THEN** code SHALL use `Object.entries()` for key-value pairs
- **AND** code SHALL use `Object.keys()` when only keys are needed
- **AND** code SHALL avoid `for...in` loops when `Object.entries()` is more appropriate
