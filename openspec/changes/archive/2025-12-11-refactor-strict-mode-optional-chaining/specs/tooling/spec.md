# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Optional chaining for nested access
- **WHEN** accessing nested optional properties or methods
- **THEN** code SHALL use optional chaining (`?.`) operator
- **AND** code SHALL avoid nested `if` checks for optional property access
- **AND** code SHALL use `?.` with `??` for optional access with defaults
- **AND** code SHALL prefer `?.` over `&&` chains for optional access

#### Scenario: Optional method calls
- **WHEN** calling optional methods
- **THEN** code SHALL use `?.()` for optional method calls
- **AND** code SHALL avoid `if` checks when `?.()` is sufficient
- **AND** code SHALL use `??` for default return values when needed
