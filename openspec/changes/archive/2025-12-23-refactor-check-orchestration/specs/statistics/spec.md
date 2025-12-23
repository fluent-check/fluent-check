## ADDED Requirements

### Requirement: Statistics Aggregator

The system SHALL provide a `StatisticsAggregator` abstraction responsible for converting raw execution data into `FluentStatistics`.

#### Scenario: Aggregator interface
- **WHEN** statistics are aggregated after exploration and shrinking
- **THEN** the system SHALL call a `StatisticsAggregator.aggregate(input)` method where `input` contains:
  - `testsRun`: total number of test cases executed
  - `skipped`: number of discarded tests (precondition failures)
  - `executionTimeMs`: total execution time including shrinking
  - `counterexampleFound`: whether a counterexample was found
  - `executionTimeBreakdown`: exploration vs. shrinking times
  - `labels?`: optional classification/coverage label counts
  - `detailedStats?`: optional detailed per-arbitrary/event/target stats
  - `shrinkingStats?`: optional shrinking statistics

#### Scenario: Deterministic aggregation
- **WHEN** `StatisticsAggregator.aggregate()` is called with the same input
- **THEN** it SHALL return the same `FluentStatistics` object (value-wise)
- **AND** it SHALL NOT perform logging, I/O, or other side effects

#### Scenario: FluentStatistics invariants preserved
- **WHEN** `StatisticsAggregator.aggregate()` produces `FluentStatistics`
- **THEN** it SHALL preserve existing invariants:
  - `testsRun = testsPassed + testsDiscarded` for satisfiable results
  - `testsRun = testsPassed + testsDiscarded + 1` for unsatisfiable results
- **AND** it SHALL correctly populate:
  - Label percentages when labels are present
  - Event percentages when events are present
  - Target statistics when targets are present
  - Shrinking statistics when shrinking was performed

#### Scenario: Pluggable aggregator implementations
- **WHEN** alternative statistics strategies are desired (e.g., different quantile algorithms or aggregation rules)
- **THEN** the system MAY provide alternative `StatisticsAggregator` implementations
- **AND** `FluentCheck` SHALL treat the aggregator as a dependency that can be swapped without changing orchestration logic

