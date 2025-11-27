## ADDED Requirements

### Requirement: FluentStatistics

The system SHALL provide a `FluentStatistics` interface containing detailed test execution metrics.

#### Scenario: Execution metrics
- **WHEN** a test completes
- **THEN** `statistics.testsRun` SHALL contain the number of tests executed
- **AND** `statistics.testsDiscarded` SHALL contain tests filtered by preconditions
- **AND** `statistics.executionTimeMs` SHALL contain the execution time

#### Scenario: Confidence metrics
- **WHEN** a test completes successfully
- **THEN** `statistics.confidence` SHALL contain the posterior probability the property holds
- **AND** `statistics.credibleInterval` SHALL contain the credible interval

#### Scenario: Label metrics
- **WHEN** tests are labeled via `classify()` or `label()`
- **THEN** `statistics.labels` SHALL contain a map of label names to counts

#### Scenario: Arbitrary statistics
- **WHEN** arbitraries are used in a test
- **THEN** `statistics.arbitraryStats` SHALL contain per-arbitrary statistics
- **AND** include samples generated, unique values, and corner cases tested

### Requirement: Enhanced FluentResult

The system SHALL extend `FluentResult` to include the `statistics` field.

#### Scenario: Statistics in result
- **WHEN** `.check()` completes
- **THEN** `result.statistics` SHALL be populated with test metrics
- **AND** existing fields (`satisfiable`, `example`, `seed`) remain unchanged

### Requirement: Statistical Error Reporting

The system SHALL enhance `FluentReporter` to include statistical context in error messages.

#### Scenario: Include test count in error
- **WHEN** a property fails
- **THEN** the error message SHALL include how many tests were run before failure

#### Scenario: Include coverage failures
- **WHEN** a coverage check fails
- **THEN** the error message SHALL list which coverage requirements were not met
- **AND** show observed vs. required percentages
