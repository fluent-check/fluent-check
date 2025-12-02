# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Optional values with defaults
- **WHEN** handling optional values that need default values
- **THEN** code SHALL use nullish coalescing (`??`) operator
- **AND** code SHALL avoid explicit `if (x === undefined)` checks for defaults
- **AND** code SHALL use `??=` for assignment defaults when appropriate
- **AND** code SHALL prefer `??` over `||` for undefined/null defaults

#### Scenario: Safe array access with defaults
- **WHEN** accessing array elements that may be undefined
- **THEN** code SHALL use `at()` method with nullish coalescing for defaults
- **AND** code SHALL avoid explicit undefined checks when `at()` with `??` is sufficient
- **AND** code SHALL use `??` for default values after `at()` access
