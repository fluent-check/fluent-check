## ADDED Requirements

### Requirement: Basic Statistics in FluentResult

The system SHALL include basic execution statistics in every FluentResult.

#### Scenario: Statistics available after check
- **WHEN** `.check()` completes
- **THEN** `result.statistics` SHALL be populated with execution metrics
- **AND** existing fields (`satisfiable`, `example`, `seed`, `skipped`) SHALL remain unchanged

#### Scenario: Test count statistics
- **WHEN** tests are executed
- **THEN** `result.statistics.testsRun` SHALL equal the total number of test cases executed
- **AND** `result.statistics.testsPassed` SHALL equal tests where the property held
  - For satisfiable results: `testsPassed = testsRun - skipped`
  - For unsatisfiable results: `testsPassed = testsRun - skipped - 1`
- **AND** `result.statistics.testsDiscarded` SHALL equal tests filtered by preconditions (same as `skipped`)

#### Scenario: Execution time tracking
- **WHEN** tests complete
- **THEN** `result.statistics.executionTimeMs` SHALL contain the total execution time in milliseconds
- **AND** the measured time SHALL be within 10% of actual wall-clock time
