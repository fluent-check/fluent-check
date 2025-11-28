## ADDED Requirements

### Requirement: Test Case Classification

The system SHALL provide methods to classify and label test cases for coverage analysis.

#### Scenario: Classify with predicate
- **WHEN** `.classify(predicate, label)` is called
- **THEN** test cases satisfying the predicate SHALL be labeled
- **AND** label counts SHALL appear in `result.statistics.labels`

#### Scenario: Multiple classifications
- **WHEN** multiple `.classify()` calls are chained
- **THEN** each classification SHALL be tracked independently
- **AND** a single test case MAY have multiple labels

#### Scenario: Label with value
- **WHEN** `.label(fn)` is called where `fn` returns a string
- **THEN** the returned string SHALL be used as the label for that test case

#### Scenario: Collect values
- **WHEN** `.collect(fn)` is called
- **THEN** the returned value SHALL be converted to a string and collected as a label

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
- **AND** results SHALL be reported as a table

### Requirement: Statistical Check Variants

The system SHALL provide check variants with statistical features.

#### Scenario: Check with statistics
- **WHEN** `.check()` is called
- **THEN** `result.statistics` SHALL contain basic execution metrics

#### Scenario: Check with confidence
- **WHEN** `.checkWithConfidence(level)` is called
- **THEN** testing SHALL continue until the confidence level is achieved
- **AND** `result.statistics.confidence` SHALL meet or exceed the level

#### Scenario: Verbose check
- **WHEN** `.check({ verbose: true })` is called
- **THEN** statistics SHALL be logged to the console during and after execution
