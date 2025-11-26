# Reporting

## Purpose

Test result reporting and assertion integration for property-based tests. Provides structured results containing success/failure status, examples or counterexamples, and reproducibility seeds, along with an expect function for seamless test framework integration.

## Requirements

### Requirement: FluentResult

The system SHALL provide a `FluentResult` class containing test execution outcomes.

#### Scenario: Success result
- **WHEN** a property is satisfied
- **THEN** `result.satisfiable` SHALL be `true`
- **AND** `result.example` contains a satisfying example

#### Scenario: Failure result
- **WHEN** a property is not satisfied
- **THEN** `result.satisfiable` SHALL be `false`
- **AND** `result.example` contains the shrunk counterexample

#### Scenario: Seed included
- **WHEN** a test completes
- **THEN** `result.seed` contains the seed used for reproduction

### Requirement: Expect Function

The system SHALL provide an `expect(result)` function for assertion integration.

#### Scenario: Pass on satisfiable
- **WHEN** `expect(result)` is called with a satisfiable result
- **THEN** no error is thrown

#### Scenario: Throw on unsatisfiable
- **WHEN** `expect(result)` is called with an unsatisfiable result
- **THEN** a `FluentReporter` error is thrown

### Requirement: FluentReporter Error

The system SHALL provide a `FluentReporter` error class for test framework integration.

#### Scenario: Error name
- **WHEN** a FluentReporter error is thrown
- **THEN** its name SHALL be "Property not satisfiable"

#### Scenario: Error message
- **WHEN** a FluentReporter error is thrown
- **THEN** its message SHALL include the counterexample as JSON

### Requirement: Example Unwrapping

The system SHALL unwrap FluentPick values to plain values in results.

#### Scenario: Unwrap picks
- **WHEN** a result is returned from `check()`
- **THEN** `result.example` contains plain values, not FluentPick wrappers
- **AND** values are accessible by their bound variable names
