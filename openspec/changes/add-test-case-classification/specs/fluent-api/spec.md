## ADDED Requirements

### Requirement: Test Case Classification Methods

The system SHALL provide methods for classifying, labeling, and collecting test case data.

#### Scenario: Classify by predicate
- **WHEN** `.classify(predicate, label)` is called on a FluentCheck
- **THEN** a classification node SHALL be added to the scenario
- **AND** the predicate SHALL be evaluated for each test case
- **AND** the label SHALL be counted when the predicate returns true
- **AND** the method SHALL return a new FluentCheck instance (chainable)

#### Scenario: Dynamic labeling
- **WHEN** `.label(fn)` is called on a FluentCheck
- **THEN** a label node SHALL be added to the scenario
- **AND** the function SHALL be evaluated for each test case to determine the label
- **AND** the returned label string SHALL be counted
- **AND** the method SHALL return a new FluentCheck instance (chainable)

#### Scenario: Value collection
- **WHEN** `.collect(fn)` is called on a FluentCheck
- **THEN** a collect node SHALL be added to the scenario
- **AND** the function SHALL be evaluated for each test case
- **AND** the returned value (string or number) SHALL be used as a label and counted
- **AND** the method SHALL return a new FluentCheck instance (chainable)

#### Scenario: Multiple classifications
- **WHEN** multiple `.classify()`, `.label()`, or `.collect()` calls are chained
- **THEN** all classifications SHALL be evaluated for each test case
- **AND** multiple labels SHALL be counted for the same test case if applicable
- **AND** overlapping predicates (multiple classify matching same test) SHALL all be counted

#### Scenario: Classification with preconditions
- **WHEN** classifications are used with `fc.pre()` preconditions
- **THEN** classifications SHALL be evaluated for all test cases (including discarded)
- **AND** label counts SHALL include discarded test cases
- **AND** label percentages SHALL be calculated based on `testsRun`, not `testsPassed`

#### Scenario: Classification type safety
- **WHEN** classification methods are called
- **THEN** the `Rec` type parameter SHALL be preserved
- **AND** predicate/label/collect functions SHALL receive correctly typed arguments
- **AND** TypeScript SHALL enforce type safety at compile time
