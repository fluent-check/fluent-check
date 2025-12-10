## MODIFIED Requirements

### Requirement: Check Execution

The system SHALL provide a `check()` method that executes the property-based test and returns a result.

#### Scenario: Execute property test
- **WHEN** `.check()` is called
- **THEN** test cases are generated according to the strategy
- **AND** a FluentResult is returned with `satisfiable` boolean
- **AND** `example` containing the witness or counterexample
- **AND** `seed` for reproducibility

#### Scenario: Budget exhausted on universal property
- **WHEN** `.check()` exhausts its test or time budget without finding a counterexample in a scenario with only `forall` quantifiers
- **THEN** the returned FluentResult SHALL have `satisfiable: true`
- **AND** it SHALL mark `completion` as `exhausted` with budget context (tests run, skipped)
- **AND** its `example` SHALL be empty (no counterexample or witness)

#### Scenario: Budget exhausted on existential property
- **WHEN** `.check()` exhausts its test or time budget without finding a satisfying witness in a scenario containing `exists` quantifiers
- **THEN** the returned FluentResult SHALL have `satisfiable: false`
- **AND** it SHALL mark `completion` as `exhausted` with budget context (tests run, skipped)
- **AND** its `example` SHALL be empty (no witness found)

### Requirement: FluentResult Assertion Methods

The `FluentResult` class SHALL provide assertion methods for fluent test verification.

#### Scenario: Assert satisfiable success
- **WHEN** `assertSatisfiable()` is called on a satisfiable result
- **THEN** no error SHALL be thrown
- **AND** the method SHALL return void

#### Scenario: Assert satisfiable failure
- **WHEN** `assertSatisfiable()` is called on an unsatisfiable result (e.g., a counterexample was found, or no witness was found for an existential property)
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL include the counterexample or exhaustion reason
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

#### Scenario: Assert completion status
- **WHEN** `assertComplete()` is called on a result with `completion` equal to `complete`
- **THEN** no error SHALL be thrown
- **AND** the method SHALL return void

#### Scenario: Assert completion failure on exhaustion
- **WHEN** `assertComplete()` is called on a result with `completion` equal to `exhausted`
- **THEN** an error SHALL be thrown
- **AND** the error message SHALL indicate the run was incomplete due to budget exhaustion
