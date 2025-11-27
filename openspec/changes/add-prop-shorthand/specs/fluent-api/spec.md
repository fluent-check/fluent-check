# Fluent API

## ADDED Requirements

### Requirement: Property Shorthand

The system SHALL provide a simplified `prop()` function for defining property tests without the full BDD structure.

#### Scenario: Single arbitrary property
- **WHEN** a property is defined with `fc.prop(arb, predicate)`
- **THEN** the property SHALL be tested against values from the arbitrary
- **AND** the predicate SHALL receive the generated value as its argument

#### Scenario: Multiple arbitrary property
- **WHEN** a property is defined with `fc.prop(arb1, arb2, ..., predicate)`
- **THEN** the predicate SHALL receive values from each arbitrary as positional arguments
- **AND** up to 5 arbitraries SHALL be supported

#### Scenario: Property assertion
- **WHEN** `assert()` is called on a property
- **THEN** the property SHALL be checked
- **AND** an error SHALL be thrown if the property is not satisfiable
- **AND** the error message SHALL include the counterexample

#### Scenario: Property check without assertion
- **WHEN** `check()` is called on a property
- **THEN** a `FluentResult` SHALL be returned
- **AND** no error SHALL be thrown regardless of satisfiability

#### Scenario: Property with strategy configuration
- **WHEN** `config(strategy)` is called on a property
- **THEN** the property SHALL use the provided strategy for testing
- **AND** a new `FluentProperty` SHALL be returned for chaining
