## MODIFIED Requirements

### Requirement: FluentResult

The system SHALL provide a `FluentResult` class containing test execution outcomes, including completion state and budget context.

#### Scenario: Success result
- **WHEN** a property is satisfied and execution completes within budget
- **THEN** `result.satisfiable` SHALL be `true`
- **AND** `result.example` contains a satisfying example (empty for pure `forall` scenarios)
- **AND** `result.completion` SHALL be `complete`

#### Scenario: Failure result
- **WHEN** a property is not satisfied and a counterexample is found within budget
- **THEN** `result.satisfiable` SHALL be `false`
- **AND** `result.example` contains the shrunk counterexample
- **AND** `result.completion` SHALL be `complete`
- **AND** `result.reason` SHALL indicate `counterexample`

#### Scenario: Seed included
- **WHEN** a test completes
- **THEN** `result.seed` contains the seed used for reproduction

#### Scenario: Budget exhausted on universal property
- **WHEN** the exploration budget is exhausted before any counterexample is found in a scenario with only `forall` quantifiers
- **THEN** `result.satisfiable` SHALL remain `true` (no counterexample observed)
- **AND** `result.example` SHALL be empty
- **AND** `result.completion` SHALL be `exhausted`
- **AND** `result.reason` SHALL indicate `budget-exhausted`

#### Scenario: Budget exhausted on existential property
- **WHEN** the exploration budget is exhausted before finding a satisfying witness in a scenario containing `exists` quantifiers
- **THEN** `result.satisfiable` SHALL be `false`
- **AND** `result.example` SHALL be empty (no witness found)
- **AND** `result.completion` SHALL be `exhausted`
- **AND** `result.reason` SHALL indicate `no-witness`

#### Scenario: Budget context reported
- **WHEN** a `FluentResult` is produced
- **THEN** it SHALL expose test execution context (tests run, skipped counts, and completion state) so callers can interpret `satisfiable` alongside coverage or exhaustion

### Requirement: Expect Function

The system SHALL provide an `expect(result)` function for assertion integration.

#### Scenario: Pass on satisfiable
- **WHEN** `expect(result)` is called with a satisfiable result
- **THEN** no error is thrown, even if `result.completion` is `exhausted` for pure `forall` scenarios

#### Scenario: Throw on unsatisfiable
- **WHEN** `expect(result)` is called with an unsatisfiable result due to a counterexample
- **THEN** a `FluentReporter` error is thrown

#### Scenario: Throw on exhausted existential
- **WHEN** `expect(result)` is called with an unsatisfiable result because no witness was found before exhausting the budget
- **THEN** a `FluentReporter` error is thrown
- **AND** the error SHALL communicate that the run exhausted its budget without finding a witness (not that a counterexample was found)

### Requirement: FluentReporter Error

The system SHALL provide a `FluentReporter` error class for test framework integration.

#### Scenario: Error name
- **WHEN** a FluentReporter error is thrown
- **THEN** its name SHALL be "Property not satisfiable"

#### Scenario: Error message for counterexample
- **WHEN** a FluentReporter error is thrown because a counterexample was found
- **THEN** its message SHALL include the counterexample as JSON
- **AND** it SHALL include the seed for reproducibility when available

#### Scenario: Error message for budget exhaustion
- **WHEN** a FluentReporter error is thrown because the budget was exhausted without finding a witness
- **THEN** its message SHALL describe the exhaustion state (e.g., tests run, completion)
- **AND** it SHALL avoid claiming a counterexample was found
- **AND** it SHALL include the seed for reproducibility when available
