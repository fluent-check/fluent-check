# Arbitraries

## MODIFIED Requirements

### Requirement: Literal Type Preservation for Internal Objects

The regex module SHALL use the `satisfies` operator on internal object literals to preserve literal key types while validating conformance to broader types.

#### Scenario: charClassMap literal keys
- **WHEN** `keyof typeof charClassMap` is evaluated in type context
- **THEN** the type SHALL be a union of the exact literal keys (`'\\d' | '[0-9]' | '\\w' | ...`)
- **AND** the object SHALL still satisfy `Record<string, Arbitrary<string>>`

#### Scenario: simplifyMappings literal keys
- **WHEN** `keyof typeof simplifyMappings` is evaluated in type context
- **THEN** the type SHALL be a union of the exact literal keys (`'9' | '8' | '7' | ... | '1' | 'Z' | 'Y'`)
- **AND** the object SHALL still satisfy `Record<string, string[]>`

### Requirement: Pattern Generators

The system SHALL provide pre-built generators for common patterns via `fc.patterns`, with literal key types preserved for type-safe access.

#### Scenario: email pattern
- **WHEN** `fc.patterns.email()` is called
- **THEN** valid email address strings are generated

#### Scenario: uuid pattern
- **WHEN** `fc.patterns.uuid()` is called
- **THEN** valid UUID v4 strings are generated

#### Scenario: ipv4 pattern
- **WHEN** `fc.patterns.ipv4()` is called
- **THEN** valid IPv4 address strings are generated

#### Scenario: url pattern
- **WHEN** `fc.patterns.url()` is called
- **THEN** valid URL strings are generated

#### Scenario: Pattern key type inference
- **WHEN** `keyof typeof fc.patterns` is evaluated
- **THEN** the type SHALL be a union of literal strings (`'email' | 'uuid' | 'ipv4' | 'url'`)
- **AND** consumers SHALL be able to iterate pattern names type-safely
