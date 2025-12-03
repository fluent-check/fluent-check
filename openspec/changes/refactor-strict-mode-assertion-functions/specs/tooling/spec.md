# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Assertion functions for type narrowing (PREFERRED)
- **WHEN** validation functions narrow types from `T | undefined` to `T` and validation must happen at runtime
- **THEN** code SHALL use TypeScript assertion functions (`asserts x is T`) for automatic type narrowing
- **AND** assertion functions SHALL provide clear error messages on validation failure
- **AND** assertion functions SHALL be used in constructors and initialization code where appropriate
- **AND** type narrowing SHALL eliminate the need for subsequent undefined checks
- **AND** assertion functions SHALL be preferred over manual type guards when runtime validation is required

#### Scenario: Bounds validation with assertion functions
- **WHEN** validating array indices or object key access
- **THEN** code SHALL use assertion functions to validate bounds before access
- **AND** assertion functions SHALL provide clear error messages with index/key information
- **AND** type narrowing SHALL allow safe access after assertion
- **AND** code SHALL avoid non-null assertions (`!`) when assertion functions can be used

#### Scenario: Schema validation with assertion functions
- **WHEN** validating record/schema structures at construction
- **THEN** code SHALL use assertion functions to validate required keys
- **AND** assertion functions SHALL narrow types to express validated state
- **AND** validated structures SHALL be stored with narrowed types
- **AND** subsequent access SHALL not require runtime checks
