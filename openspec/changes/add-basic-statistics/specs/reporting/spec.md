## ADDED Requirements

### Requirement: FluentStatistics Interface

The system SHALL provide a FluentStatistics interface for test execution metrics.

#### Scenario: Basic statistics fields
- **WHEN** a test completes
- **THEN** `statistics.testsRun` SHALL be a number representing total tests executed
- **AND** `statistics.testsPassed` SHALL be a number representing tests that passed
- **AND** `statistics.testsDiscarded` SHALL be a number representing filtered tests
- **AND** `statistics.executionTimeMs` SHALL be a number representing execution time
