# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Known data structures with type-level transformation
- **WHEN** controlling data structures (e.g., schemas, configs) at construction/initialization
- **THEN** code SHALL validate structures at construction/initialization
- **AND** code SHALL use type-level transformations (mapped types, `Required<T>`) to express validated state
- **AND** code SHALL store validated structures with transformed types
- **AND** code SHALL eliminate runtime checks for validated properties
- **AND** type system SHALL guarantee validated properties are present and non-nullable

#### Scenario: Schema validation at construction
- **WHEN** class constructor receives schema or configuration
- **THEN** code SHALL validate schema completeness at construction
- **AND** code SHALL use mapped types to transform optional schema to required
- **AND** code SHALL store validated schema with transformed type
- **AND** methods SHALL not require runtime checks for validated properties
- **AND** type system SHALL reflect validation state in types
