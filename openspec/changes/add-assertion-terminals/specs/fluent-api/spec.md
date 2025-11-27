# Fluent API

## ADDED Requirements

### Requirement: FluentResult Assertion Methods

The `FluentResult` class SHALL provide assertion methods for fluent test verification.

#### Scenario: Assert satisfiable success
- **WHEN** `assertSatisfiable()` is called on a satisfiable result
- **THEN** no error SHALL be thrown
- **AND** the method SHALL return void

#### Scenario: Assert satisfiable failure
- **WHEN** `assertSatisfiable()` is called on an unsatisfiable result
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL include the counterexample
- **AND** the error message SHALL include the seed for reproducibility

#### Scenario: Assert not satisfiable success
- **WHEN** `assertNotSatisfiable()` is called on an unsatisfiable result
- **THEN** no error SHALL be thrown

#### Scenario: Assert not satisfiable failure
- **WHEN** `assertNotSatisfiable()` is called on a satisfiable result
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL include the found example

#### Scenario: Assert example match
- **WHEN** `assertExample(expected)` is called
- **AND** the result example matches the expected partial object
- **THEN** no error SHALL be thrown

#### Scenario: Assert example mismatch
- **WHEN** `assertExample(expected)` is called
- **AND** the result example does not match the expected partial object
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL indicate which properties differ

#### Scenario: Custom error message
- **WHEN** an assertion method is called with a custom message
- **THEN** the custom message SHALL be included in any thrown error
