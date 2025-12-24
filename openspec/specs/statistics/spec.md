# Statistics

## Purpose

Statistical distributions and confidence calculations for property-based testing.
## Requirements
### Requirement: Distribution Base Class

The system SHALL provide an abstract `Distribution` class for probability distributions.

#### Scenario: Distribution interface
- **WHEN** a Distribution is implemented
- **THEN** it MUST provide `mean()`, `mode()`, `pdf(x)`, `cdf(x)`, and `inv(p)` methods

### Requirement: Integer Distribution

The system SHALL provide an `IntegerDistribution` class for discrete distributions over contiguous integers.

#### Scenario: Support bounds
- **WHEN** an IntegerDistribution is queried
- **THEN** `supportMin()` and `supportMax()` return the distribution bounds

#### Scenario: Default mean implementation
- **WHEN** `mean()` is not overridden
- **THEN** it is calculated by summing k times pdf(k) over the support

#### Scenario: Default mode implementation
- **WHEN** `mode()` is not overridden
- **THEN** it is calculated by finding the k with maximum pdf(k)

#### Scenario: Default CDF implementation
- **WHEN** `cdf(k)` is not overridden
- **THEN** it is calculated by summing pdf(k) from supportMin to k

#### Scenario: Default inverse CDF implementation
- **WHEN** `inv(p)` is not overridden
- **THEN** it is calculated using binary search on the CDF

### Requirement: Beta Distribution

The system SHALL provide a `BetaDistribution` class implementing the beta distribution.

#### Scenario: Create beta distribution
- **WHEN** `new BetaDistribution(alpha, beta)` is called
- **THEN** a beta distribution with the given parameters is created

#### Scenario: Beta statistics
- **WHEN** a BetaDistribution is queried
- **THEN** `mean()`, `mode()`, `pdf()`, `cdf()`, and `inv()` return correct values

### Requirement: Beta-Binomial Distribution

The system SHALL provide a `BetaBinomialDistribution` class for modeling trial outcomes with uncertainty.

#### Scenario: Create beta-binomial distribution
- **WHEN** `new BetaBinomialDistribution(trials, alpha, beta)` is called
- **THEN** a beta-binomial distribution is created

#### Scenario: Closed-form mean
- **WHEN** `mean()` is called
- **THEN** it returns trials times alpha divided by (alpha plus beta) in constant time

#### Scenario: Closed-form mode
- **WHEN** `mode()` is called
- **THEN** it returns the mode in constant time
- **AND** handles edge cases where alpha or beta is less than or equal to 1

#### Scenario: PDF via log probability
- **WHEN** `pdf(x)` is called
- **THEN** it is computed via exponentiation of log probability for numerical stability

### Requirement: Arbitrary Size Estimation

The system SHALL use statistical methods to estimate the size of filtered arbitraries.

#### Scenario: Exact size for bounded
- **WHEN** `size()` is called on `fc.integer(0, 10)`
- **THEN** the type is 'exact' and value is 11

#### Scenario: Estimated size for filtered
- **WHEN** `size()` is called on a filtered arbitrary
- **THEN** the type is 'estimated'
- **AND** a credible interval is provided

#### Scenario: Credible interval
- **WHEN** size estimation returns a credible interval
- **THEN** it represents statistical confidence bounds on the true size

### Requirement: Confidence Calculation

The system SHALL calculate Bayesian confidence that a property holds based on test results.

#### Scenario: Calculate confidence after successful tests
- **WHEN** 1000 tests pass with 0 failures
- **THEN** `statistics.confidence` reflects high probability (>0.99) that property holds
- **AND** confidence is calculated using Beta distribution posterior
- **AND** confidence represents P(pass_rate > threshold | data) where threshold defaults to 0.999

#### Scenario: Calculate confidence after mixed results
- **WHEN** 990 tests pass and 10 fail
- **THEN** `statistics.confidence` reflects lower probability
- **AND** confidence accurately represents uncertainty
- **AND** confidence decreases appropriately with failures

#### Scenario: Confidence increases with more tests
- **WHEN** a property passes consistently
- **AND** confidence is calculated after 100 tests and again after 1000 tests
- **THEN** confidence after 1000 tests is higher than after 100 tests
- **AND** the increase reflects the additional evidence

#### Scenario: Confidence uses configured pass-rate threshold
- **WHEN** confidence is calculated with `withPassRateThreshold(0.99)` vs default (0.999)
- **AND** the same test results are used
- **THEN** the 0.99 threshold produces higher confidence than 0.999
- **AND** both calculations use the same Beta distribution posterior

### Requirement: Credible Interval

The system SHALL provide credible intervals for the true property pass rate.

#### Scenario: Compute credible interval
- **WHEN** test results are available
- **THEN** `statistics.credibleInterval` provides a 95% credible interval
- **AND** the interval is derived from the Beta distribution posterior

#### Scenario: Narrow interval with many tests
- **WHEN** 10000 tests pass with 0 failures
- **THEN** the credible interval is narrow (e.g., [0.9997, 1.0])

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

### Requirement: Arbitrary Statistics

The system SHALL provide per-arbitrary statistics when detailed statistics are enabled.

#### Scenario: Arbitrary statistics structure
- **WHEN** detailed statistics are enabled
- **THEN** `result.statistics.arbitraryStats` SHALL be a `Record<string, ArbitraryStatistics>`
- **AND** each key SHALL be a quantifier name from the scenario
- **AND** each value SHALL contain metrics for that arbitrary's generated values

#### Scenario: Samples generated count
- **WHEN** arbitrary statistics are collected
- **THEN** `arbitraryStats[name].samplesGenerated` SHALL equal the number of values generated for that arbitrary
- **AND** it SHALL count each sample regardless of whether it passed preconditions

#### Scenario: Unique values count
- **WHEN** arbitrary statistics are collected
- **THEN** `arbitraryStats[name].uniqueValues` SHALL equal the number of distinct values generated
- **AND** distinctness SHALL be determined using the arbitrary's `hashCode()` and `equals()` functions
- **AND** if the arbitrary does not provide these functions, structural equality SHALL be used
- **NOTE** For performance, uniqueness tracking MAY use probabilistic data structures (e.g., HyperLogLog) for large sample sizes, with documented accuracy bounds

#### Scenario: Corner cases tracking
- **WHEN** arbitrary statistics are collected
- **THEN** `arbitraryStats[name].cornerCases.tested` SHALL be an array of corner case values that were generated
- **AND** `arbitraryStats[name].cornerCases.total` SHALL equal the total number of corner cases available for that arbitrary
- **AND** corner cases SHALL be identified by comparing generated values against `arbitrary.cornerCases()`

#### Scenario: Distribution statistics for numeric types
- **WHEN** arbitrary statistics are collected for numeric arbitraries (integer, float, bigint)
- **THEN** `arbitraryStats[name].distribution` SHALL contain:
  - `min`: minimum value generated
  - `max`: maximum value generated
  - `mean`: arithmetic mean of generated values
  - `median`: estimated median value (50th percentile)
  - `q1`: estimated first quartile (25th percentile)
  - `q3`: estimated third quartile (75th percentile)
  - `stdDev`: sample standard deviation
  - `count`: number of observations

#### Scenario: Distribution statistics for non-numeric types
- **WHEN** arbitrary statistics are collected for non-numeric arbitraries
- **THEN** `arbitraryStats[name].distribution` SHALL be `undefined`
- **AND** only `samplesGenerated`, `uniqueValues`, and `cornerCases` SHALL be tracked

#### Scenario: Array length statistics
- **WHEN** arbitrary statistics are collected for array arbitraries
- **THEN** `arbitraryStats[name].arrayLengths` SHALL contain:
  - `min`: minimum array length generated
  - `max`: maximum array length generated
  - `mean`: mean array length
  - `median`: estimated median array length
  - `count`: number of arrays generated

#### Scenario: String length statistics
- **WHEN** arbitrary statistics are collected for string arbitraries
- **THEN** `arbitraryStats[name].stringLengths` SHALL contain the same fields as array lengths

#### Scenario: Statistics only when enabled
- **WHEN** detailed statistics are NOT enabled
- **THEN** `result.statistics.arbitraryStats` SHALL be `undefined`
- **AND** no per-arbitrary tracking SHALL occur (zero overhead)

#### Scenario: Statistics with empty test runs
- **WHEN** detailed statistics are enabled but no tests are run (e.g., all filtered)
- **THEN** `arbitraryStats` SHALL be an empty object `{}`
- **AND** no errors SHALL be thrown

### Requirement: Event Tracking

The system SHALL provide an `event()` function for tracking ad-hoc occurrences during test execution.

#### Scenario: Event function signature
- **WHEN** `fc.event(name)` is called within a property function
- **THEN** the occurrence SHALL be recorded for the current test case
- **AND** `name` SHALL be a string identifier for the event

#### Scenario: Event counting
- **WHEN** events are recorded during test execution
- **THEN** `result.statistics.events` SHALL be a `Record<string, number>`
- **AND** each key SHALL be an event name
- **AND** each value SHALL be the count of test cases where that event occurred

#### Scenario: Multiple events per test case
- **WHEN** `fc.event(name)` is called multiple times with the same name in one test case
- **THEN** it SHALL count as one occurrence for that test case
- **AND** the event count represents "number of test cases with this event", not total calls

#### Scenario: Event percentages
- **WHEN** events are recorded
- **THEN** `result.statistics.eventPercentages` SHALL be a `Record<string, number>`
- **AND** each value SHALL be `(eventCount / testsRun) * 100`

#### Scenario: Events without detailed statistics
- **WHEN** `fc.event()` is used but detailed statistics are NOT enabled
- **THEN** events SHALL still be tracked and reported
- **AND** event tracking is independent of the `withDetailedStatistics()` setting

#### Scenario: Event with payload
- **WHEN** `fc.event(name, payload)` is called with an optional payload
- **THEN** the payload SHALL be included in debug-level output
- **AND** the payload SHALL NOT affect event counting or grouping

#### Scenario: Event context availability
- **WHEN** `fc.event()` or `fc.target()` is called
- **THEN** the system SHALL rely on the environment's context propagation (e.g., AsyncLocalStorage in Node.js)
- **AND** if context is not available (e.g., older environments), the system MAY throw an error or warn
- **AND** this dependency SHALL be documented as a requirement for event/target usage

### Requirement: Target Function (Coverage-Guided Optimization)

The system SHALL provide a `target()` function for feedback-guided exploration.

#### Scenario: Target function signature
- **WHEN** `fc.target(observation, label?)` is called within a property function
- **THEN** `observation` SHALL be a finite number (not NaN, not Infinity)
- **AND** `label` SHALL be an optional string to distinguish multiple targets

#### Scenario: Target maximization
- **WHEN** target observations are recorded
- **THEN** the explorer MAY use these observations to guide generation toward higher values
- **AND** this is an optimization hint, not a guarantee

#### Scenario: Target statistics
- **WHEN** targets are recorded during test execution
- **THEN** `result.statistics.targets` SHALL be a `Record<string, TargetStatistics>`
- **AND** each `TargetStatistics` SHALL contain:
  - `best`: the maximum observation value seen
  - `observations`: the number of observations recorded
  - `mean`: the mean of all observations

#### Scenario: Default target label
- **WHEN** `fc.target(observation)` is called without a label
- **THEN** the label SHALL default to `"default"`

#### Scenario: Invalid target observation
- **WHEN** `fc.target()` is called with NaN or Infinity
- **THEN** a warning SHALL be logged (if verbosity >= Normal)
- **AND** the observation SHALL be ignored

#### Scenario: Targets without detailed statistics
- **WHEN** `fc.target()` is used but detailed statistics are NOT enabled
- **THEN** target statistics SHALL still be tracked and reported
- **AND** target guidance MAY still influence exploration (implementation-dependent)

### Requirement: Streaming Quantile Estimation

The system SHALL use streaming algorithms for quantile estimation to avoid storing all values.

#### Scenario: Memory-efficient quantiles
- **WHEN** distribution statistics are calculated
- **THEN** quantiles (median, q1, q3) SHALL be estimated using a streaming algorithm
- **AND** the algorithm SHALL use O(k) memory where k is a configurable constant (default: 100)
- **AND** the algorithm SHALL NOT store all generated values

#### Scenario: Quantile accuracy for large samples
- **WHEN** quantiles are estimated with n > 1000 samples
- **THEN** median estimates SHALL be within 5% of the true median with 95% probability
- **AND** quartile estimates SHALL be within 10% of true quartiles with 95% probability

#### Scenario: Quantile accuracy for small samples
- **WHEN** quantiles are estimated with n <= 100 samples
- **THEN** the system MAY store all values and compute exact quantiles
- **AND** accuracy requirements do not apply (exact values are returned)

#### Scenario: Quantile estimator implementation
- **WHEN** implementing streaming quantiles for n > DEFAULT_QUANTILE_BUFFER_SIZE
- **THEN** the estimator SHALL use an algorithm with documented error bounds (e.g., P² or calibrated reservoir sampling)
- **AND** the configuration (buffer size/markers) SHALL be sufficient to meet the accuracy requirements for median and quartiles
- **AND** the estimator SHALL avoid unbounded error from naive random replacement buffers

#### Scenario: Streaming mean and variance
- **WHEN** distribution statistics are calculated
- **THEN** mean and standard deviation SHALL be calculated using Welford's online algorithm
- **AND** the algorithm SHALL update incrementally as values are generated
- **AND** the algorithm SHALL use O(1) memory
- **AND** the algorithm SHALL be numerically stable

### Requirement: Extended FluentStatistics

The system SHALL extend FluentStatistics with detailed statistics fields.

#### Scenario: Arbitrary stats field
- **WHEN** detailed statistics are enabled
- **THEN** `FluentStatistics` SHALL include an optional `arbitraryStats` field
- **AND** the field SHALL be a `Record<string, ArbitraryStatistics>`
- **AND** if detailed statistics are disabled, the field SHALL be `undefined`

#### Scenario: Events field
- **WHEN** `fc.event()` is used during test execution
- **THEN** `FluentStatistics` SHALL include `events` and `eventPercentages` fields
- **AND** these fields SHALL be `undefined` if no events were recorded

#### Scenario: Targets field
- **WHEN** `fc.target()` is used during test execution
- **THEN** `FluentStatistics` SHALL include a `targets` field
- **AND** this field SHALL be `undefined` if no targets were recorded

#### Scenario: Statistics collection overhead
- **WHEN** detailed statistics are enabled
- **THEN** execution time overhead SHALL be at most 20% compared to basic statistics
- **AND** memory overhead SHALL be O(k * n) where k is a small constant and n is the number of quantifiers
- **NOTE** The 5-15% target is aspirational; 20% is the acceptable upper bound

