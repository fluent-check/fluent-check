# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Validate once, assert safely (when runtime validation required)
- **WHEN** runtime validation is necessary and cannot be expressed at type level
- **THEN** code SHALL validate bounds/validity upfront at function start or construction
- **AND** code SHALL use non-null assertions (`!`) after validation instead of repeated undefined checks
- **AND** validation SHALL happen once, not repeatedly throughout the function
- **AND** non-null assertions SHALL only be used when validation is clear and nearby
- **AND** code SHALL prefer assertion functions over non-null assertions when error messages are needed

#### Scenario: Early validation at function start
- **WHEN** function requires validation of bounds, existence, or structure
- **THEN** code SHALL validate at the start of the function (fail fast)
- **AND** code SHALL leverage TypeScript 5.5+ type inference after validation (control flow narrowing, inferred type predicates)
- **AND** code SHALL avoid non-null assertions (`!`) when type inference can handle the case
- **AND** code SHALL avoid redundant undefined checks after validation
- **AND** error messages SHALL be clear when validation fails

#### Scenario: Construction-time validation
- **WHEN** object construction requires validation of schema or configuration
- **THEN** code SHALL validate at construction time
- **AND** validated state SHALL be stored with type-level transformations (mapped types, `Required<T>`)
- **AND** methods SHALL leverage TypeScript 5.5+ type inference after construction validation
- **AND** methods SHALL avoid non-null assertions (`!`) when type inference can handle the case
- **AND** code SHALL avoid runtime checks in methods when validation happened at construction
