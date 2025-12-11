## ADDED Requirements

### Requirement: Coverage Results in Statistics

The system SHALL provide coverage verification results in FluentStatistics.

#### Scenario: Coverage results structure
- **WHEN** `.checkCoverage()` completes
- **THEN** `result.statistics.coverageResults` SHALL be an array of CoverageResult objects
- **AND** each CoverageResult SHALL contain:
  - `label: string` - the label being verified
  - `requiredPercentage: number` - the minimum required percentage (0-100)
  - `observedPercentage: number` - the actual observed percentage (0-100)
  - `satisfied: boolean` - whether the requirement was met
  - `confidenceInterval: [number, number]` - Wilson score confidence interval for observed percentage
  - `confidence: number` - the confidence level used (default 0.95)

#### Scenario: Coverage verification logic
- **WHEN** a coverage requirement specifies 10% minimum
- **AND** observed percentage is 8% with 95% confidence interval [6%, 10%]
- **THEN** `satisfied` SHALL be `false` (required 10% is at upper bound, not within interval)
- **AND** if observed percentage is 12% with interval [10%, 14%]
- **THEN** `satisfied` SHALL be `true` (required 10% is within interval)

#### Scenario: Wilson score interval calculation
- **WHEN** coverage verification is performed
- **THEN** Wilson score confidence interval SHALL be calculated for each coverage requirement
- **AND** the interval SHALL use the specified confidence level (default 0.95)
- **AND** the interval SHALL account for sample size (testsRun)
- **AND** the interval SHALL be valid even for small sample sizes

#### Scenario: Coverage table results
- **WHEN** `.coverTable()` is used
- **THEN** `coverageResults` SHALL contain one CoverageResult per category
- **AND** each category SHALL have its own required percentage
- **AND** categories SHALL be verified independently
- **AND** table name SHALL be included in result labels (e.g., "sizes.empty", "sizes.small")

#### Scenario: Coverage with zero tests
- **WHEN** no tests are executed (testsRun = 0)
- **THEN** `coverageResults` SHALL be undefined or empty array
- **AND** coverage verification SHALL not throw errors
- **AND** observed percentages SHALL be 0 for all requirements

#### Scenario: Coverage with all tests discarded
- **WHEN** all tests are discarded by preconditions
- **THEN** coverage requirements SHALL still be evaluated
- **AND** label counts SHALL include discarded tests (same as classification)
- **AND** observed percentages SHALL be calculated based on testsRun, not testsPassed

#### Scenario: Multiple coverage requirements
- **WHEN** multiple `.cover()` calls are used
- **THEN** `coverageResults` SHALL contain results for all requirements
- **AND** results SHALL be ordered by label (or in order added)
- **AND** each requirement SHALL be verified independently

#### Scenario: Coverage satisfaction determination
- **WHEN** required percentage is R and observed percentage is O with confidence interval [L, U]
- **THEN** `satisfied` SHALL be `true` if and only if R is within [L, U]
- **AND** if R < L, requirement is satisfied (observed is higher than required)
- **AND** if R > U, requirement is not satisfied (observed is lower than required)
- **AND** if L <= R <= U, requirement is satisfied (within confidence interval)
