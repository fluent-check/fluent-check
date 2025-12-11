# Tooling

## ADDED Requirements

### Requirement: Native Private Fields

Class fields requiring true runtime privacy SHALL use ES2022 native private fields (`#field`) instead of TypeScript's `private` keyword.

#### Scenario: Private field syntax
- **WHEN** a class field requires encapsulation
- **THEN** the field SHALL use `#` prefix syntax
- **AND** internal references SHALL use `this.#field` syntax

#### Scenario: Runtime privacy enforcement
- **WHEN** external code attempts to access private fields
- **THEN** access SHALL be blocked at runtime (not just compile-time)
- **AND** type assertions SHALL not bypass privacy

#### Scenario: TypeScript private for protected-like access
- **WHEN** subclass access to a parent field is required
- **THEN** the TypeScript `private` keyword MAY be retained
- **AND** the design decision SHALL be documented in code comments
