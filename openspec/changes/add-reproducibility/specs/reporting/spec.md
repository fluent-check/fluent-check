## MODIFIED Requirements

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

#### Scenario: Path included
- **WHEN** a test completes with a counterexample or example
- **THEN** `result.path` SHALL contain the generation path as a string
- **AND** the path format SHALL be `"<index1>:<index2>:...[:s<shrinkDepth>]"`

#### Scenario: Replay hint in assertion errors
- **WHEN** `assertSatisfiable()` throws an error
- **THEN** the error message SHALL include both seed and path
- **AND** the message SHALL include a replay suggestion like `.replay({ seed: N, path: "X:Y" })`

#### Scenario: Path in assertNotSatisfiable errors
- **WHEN** `assertNotSatisfiable()` throws an error
- **THEN** the error message SHALL include seed and path for the found example
- **AND** developers can use this to investigate why an example was found

#### Scenario: Path in assertExample errors
- **WHEN** `assertExample()` throws an error due to mismatch
- **THEN** the error message SHALL include seed and path
- **AND** the specific property mismatches SHALL be listed
