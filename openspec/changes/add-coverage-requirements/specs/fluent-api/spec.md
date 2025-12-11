## ADDED Requirements

### Requirement: Coverage Requirements Methods

The system SHALL provide methods for specifying minimum coverage requirements for test case classifications.

#### Scenario: Basic coverage requirement
- **WHEN** `.cover(percentage, predicate, label)` is called on a FluentCheck
- **THEN** a coverage node SHALL be added to the scenario
- **AND** the predicate SHALL be evaluated for each test case (same as classify)
- **AND** the label SHALL be counted when the predicate returns true
- **AND** the required percentage SHALL be stored for verification
- **AND** the method SHALL return a new FluentCheck instance (chainable)

#### Scenario: Multiple coverage requirements
- **WHEN** multiple `.cover()` calls are chained
- **THEN** all coverage requirements SHALL be tracked independently
- **AND** each requirement SHALL be verified separately
- **AND** all requirements SHALL be evaluated for each test case

#### Scenario: Coverage table
- **WHEN** `.coverTable(name, categories, getCategory)` is called
- **THEN** a coverage table node SHALL be added to the scenario
- **AND** the getCategory function SHALL be evaluated for each test case
- **AND** each category SHALL have its own required percentage
- **AND** categories SHALL be mutually exclusive (one category per test case)
- **AND** the method SHALL return a new FluentCheck instance (chainable)

#### Scenario: Coverage verification terminal
- **WHEN** `.checkCoverage(options?)` is called
- **THEN** tests SHALL be executed (same as `.check()`)
- **AND** coverage requirements SHALL be verified using statistical confidence intervals
- **AND** if any requirement is not satisfied, the result SHALL indicate failure
- **AND** `result.statistics.coverageResults` SHALL contain verification details for each requirement
- **AND** the method SHALL return a FluentResult with coverage verification results

#### Scenario: Coverage with confidence level
- **WHEN** `.checkCoverage({ confidence: 0.99 })` is called with confidence option
- **THEN** coverage verification SHALL use 99% confidence interval
- **AND** default confidence SHALL be 0.95 if not specified
- **AND** confidence level SHALL affect Wilson score interval calculation

#### Scenario: Coverage type safety
- **WHEN** coverage methods are called
- **THEN** the `Rec` type parameter SHALL be preserved
- **AND** predicate/getCategory functions SHALL receive correctly typed arguments
- **AND** TypeScript SHALL enforce type safety at compile time

#### Scenario: Coverage with existing classifications
- **WHEN** `.cover()` is used together with `.classify()`, `.label()`, or `.collect()`
- **THEN** coverage requirements SHALL work alongside existing classifications
- **AND** labels from coverage requirements SHALL be included in `statistics.labels`
- **AND** coverage verification SHALL use the same label counts as classification

#### Scenario: Coverage table category validation
- **WHEN** `.coverTable()` is called with categories object
- **THEN** getCategory function SHALL return a string matching one of the category keys
- **AND** if getCategory returns a non-existent category, it SHALL be treated as an error or ignored
- **AND** all specified categories SHALL have required percentages
