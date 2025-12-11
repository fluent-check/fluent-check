## ADDED Requirements

### Requirement: Classification Reporting

The system SHALL report classification data in test results.

#### Scenario: Labels in statistics output
- **WHEN** a test completes with classifications defined
- **THEN** `result.statistics.labels` SHALL contain the label counts
- **AND** labels SHALL be accessible for programmatic analysis
- **AND** label keys SHALL be the exact strings provided in classify/label/collect calls

#### Scenario: Label percentages in statistics output
- **WHEN** a test completes with classifications defined
- **THEN** `result.statistics.labelPercentages` SHALL contain the label percentages
- **AND** percentages SHALL be floating-point numbers between 0 and 100
- **AND** percentages SHALL be calculated with reasonable precision (at least 1 decimal place)

#### Scenario: Classification data consistency
- **WHEN** both `labels` and `labelPercentages` are present
- **THEN** `labelPercentages[label] = (labels[label] / testsRun) * 100` for each label
- **AND** the keys in both objects SHALL be identical
- **AND** both objects SHALL be present or both absent (no partial data)

#### Scenario: Classification with edge cases
- **WHEN** all test cases are discarded by preconditions
- **THEN** labels SHALL still reflect classifications evaluated before preconditions
- **AND** label percentages SHALL be based on `testsRun` (which includes discarded)
- **AND** percentages SHALL sum correctly even when `testsPassed` is 0
