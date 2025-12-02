# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Mapped types for validated structures (PREFERRED)
- **WHEN** data structures are validated at construction or initialization
- **THEN** code SHALL use mapped types to transform optional types to required types
- **AND** code SHALL create type-level representations of validated structures
- **AND** code SHALL use conditional types to express validation state in types
- **AND** type transformations SHALL reflect the validation state accurately
- **AND** validated structures SHALL be stored with transformed types to eliminate runtime checks
- **AND** these solutions SHALL have zero runtime overhead after initial validation

#### Scenario: Validated schema pattern
- **WHEN** record/schema types are validated at construction
- **THEN** code SHALL use mapped types to transform `Record<K, T | undefined>` to `Record<K, T>`
- **AND** validation SHALL happen once at construction/initialization
- **AND** validated structures SHALL be stored with transformed types
- **AND** subsequent access to validated properties SHALL not require runtime undefined checks
- **AND** type system SHALL guarantee all validated keys are present and non-nullable
