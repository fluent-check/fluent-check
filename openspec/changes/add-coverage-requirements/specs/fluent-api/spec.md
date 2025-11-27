## ADDED Requirements

### Requirement: Coverage Requirements

The system SHALL provide methods to specify and verify coverage requirements.

#### Scenario: Specify coverage percentage
- **WHEN** `.cover(percentage, predicate, label)` is called
- **THEN** at least `percentage`% of test cases SHALL satisfy the predicate
- **AND** this requirement SHALL be verified statistically

#### Scenario: Check coverage
- **WHEN** `.checkCoverage()` is called instead of `.check()`
- **THEN** the test SHALL fail if any coverage requirements are not met
- **AND** the result SHALL include which requirements failed

#### Scenario: Coverage table
- **WHEN** `.coverTable(tableName, categories, getCategory)` is called
- **THEN** each category SHALL have coverage requirements tracked
- **AND** results SHALL be reported together

#### Scenario: Coverage options
- **WHEN** `.checkCoverage({ confidence: 0.99, maxTests: 10000 })` is called
- **THEN** verification SHALL use the specified confidence level
- **AND** testing SHALL stop at maxTests if requirements cannot be verified

### Requirement: Coverage Chaining

The system SHALL support chaining coverage requirements with classifications.

#### Scenario: Chain with andCover
- **WHEN** `.cover(...).andCover(percentage, predicate, label)` is called
- **THEN** both requirements SHALL be verified

#### Scenario: Cover after classify
- **WHEN** `.classify(...).cover(...)` is called
- **THEN** both classification and coverage SHALL be tracked
