## MODIFIED Requirements

### Requirement: FluentStatistics Interface

The system SHALL extend FluentStatistics with classification data.

#### Scenario: Labels field
- **WHEN** classifications are defined in a scenario
- **THEN** `result.statistics.labels` SHALL be a Record<string, number>
- **AND** each key SHALL be a label string from classify/label/collect
- **AND** each value SHALL be the count of test cases that received that label
- **AND** if no classifications are defined, `labels` SHALL be undefined

#### Scenario: Label percentages field
- **WHEN** classifications are defined in a scenario
- **THEN** `result.statistics.labelPercentages` SHALL be a Record<string, number>
- **AND** each key SHALL be a label string from classify/label/collect
- **AND** each value SHALL be the percentage (0-100) of test cases with that label
- **AND** percentages SHALL be calculated as `(count / testsRun) * 100`
- **AND** if no classifications are defined, `labelPercentages` SHALL be undefined

#### Scenario: Label count accuracy
- **WHEN** tests are executed with classifications
- **THEN** label counts SHALL equal the exact number of test cases that matched each label
- **AND** counts SHALL include discarded test cases (evaluated before preconditions)
- **AND** counts SHALL include the counterexample test case (if property is unsatisfiable)

#### Scenario: Label percentage calculation
- **WHEN** label percentages are calculated
- **THEN** percentages SHALL be based on `testsRun` (total executed), not `testsPassed`
- **AND** percentages SHALL sum to at least 100% (can exceed 100% if test cases have multiple labels)
- **AND** percentages SHALL be floating-point numbers (not necessarily integers)
- **AND** if `testsRun` is 0, percentages SHALL be undefined or all 0

#### Scenario: Multiple labels per test case
- **WHEN** a test case matches multiple classification predicates
- **THEN** all matching labels SHALL be counted
- **AND** label percentages can sum to more than 100%
- **AND** each label's count SHALL be independent

#### Scenario: Classification with no test cases
- **WHEN** a scenario has classifications but no tests are executed
- **THEN** `labels` SHALL be an empty object `{}` or undefined
- **AND** `labelPercentages` SHALL be an empty object `{}` or undefined
