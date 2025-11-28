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

#### Scenario: Label with dynamic value
- **WHEN** `.label(fn)` is called where `fn` returns a string
- **THEN** the returned string SHALL be used as the label for that test case

#### Scenario: Collect values
- **WHEN** `.collect(fn)` is called
- **THEN** the returned value SHALL be converted to a string and collected as a label

#### Scenario: Label percentages
- **WHEN** tests complete with classifications
- **THEN** `result.statistics.labelPercentages` SHALL contain percentage for each label
- **AND** percentages SHALL be calculated as `(labelCount / testsRun) * 100`

### Requirement: Classification Chaining

The system SHALL support fluent chaining of classification methods.

#### Scenario: Chain with and()
- **WHEN** `.classify(...).and(predicate, label)` is called
- **THEN** both classifications SHALL be applied
- **AND** type inference SHALL be preserved through the chain

#### Scenario: Classification before assertion
- **WHEN** `.classify(...)` is followed by `.then(...)`
- **THEN** the assertion SHALL have access to the same typed arguments
