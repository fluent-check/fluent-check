# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Early validation at function start
- **WHEN** function requires validation of bounds, existence, or structure
- **THEN** code SHALL validate at the start of the function (fail fast)
- **AND** code SHALL check preconditions before computation
- **AND** code SHALL provide clear error messages when validation fails
- **AND** code SHALL avoid nested validation patterns
- **AND** code SHALL use assertion functions for early validation where appropriate

#### Scenario: Precondition checks before processing
- **WHEN** function has preconditions that must be met
- **THEN** code SHALL validate preconditions at function start
- **AND** code SHALL fail fast with descriptive error messages
- **AND** code SHALL avoid computation before validation
- **AND** code flow SHALL be clearer with early validation
