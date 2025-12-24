## ADDED Requirements

### Requirement: Detailed Statistics Configuration

The system SHALL provide a strategy option to enable detailed statistics collection.

#### Scenario: Enable detailed statistics
- **WHEN** `fc.strategy().withDetailedStatistics()` is called
- **THEN** the strategy factory SHALL enable detailed statistics collection
- **AND** per-arbitrary tracking SHALL be activated
- **AND** distribution tracking SHALL be activated for numeric arbitraries

#### Scenario: Detailed statistics disabled by default
- **WHEN** a strategy is created without explicit configuration
- **THEN** detailed statistics SHALL be disabled
- **AND** only basic statistics SHALL be collected
- **AND** there SHALL be zero overhead from detailed statistics tracking

#### Scenario: Detailed statistics chaining
- **WHEN** `withDetailedStatistics()` is called
- **THEN** it SHALL return the factory for method chaining
- **AND** it SHALL be combinable with other strategy options

### Requirement: Verbosity Configuration in Strategy

The system SHALL allow configuring verbosity through the strategy factory.

#### Scenario: Verbosity in factory
- **WHEN** `fc.strategy().withVerbosity(level)` is called
- **THEN** the strategy factory SHALL store the verbosity level
- **AND** the verbosity SHALL be passed to FluentCheck during execution
- **AND** the method SHALL return the factory for chaining

#### Scenario: Verbosity propagation
- **WHEN** a strategy with verbosity is used
- **THEN** the verbosity level SHALL be available to:
  - FluentCheck for controlling output decisions
  - FluentReporter for formatting error messages
  - Explorer for debug output (if Debug level)
  - Progress callbacks (if configured)

#### Scenario: Default verbosity in strategy
- **WHEN** verbosity is not explicitly configured via strategy
- **THEN** `Verbosity.Normal` SHALL be used

### Requirement: Statistics Collection Architecture

The system SHALL collect detailed statistics using the Explorer architecture.

#### Scenario: Statistics collection during exploration
- **WHEN** detailed statistics are enabled
- **THEN** the Explorer SHALL collect per-arbitrary metrics during `explore()`
- **AND** metrics SHALL include:
  - Samples generated per quantifier
  - Unique values per quantifier (tracked via hash set)
  - Corner cases tested per quantifier
  - Distribution data for numeric values (via streaming algorithm)
  - Array/string lengths for collection arbitraries

#### Scenario: Statistics context object
- **WHEN** detailed statistics are enabled
- **THEN** a `StatisticsContext` object SHALL be created at exploration start
- **AND** it SHALL be passed through the exploration pipeline
- **AND** it SHALL aggregate data from all quantifiers

#### Scenario: Statistics per quantifier
- **WHEN** statistics are collected
- **THEN** each quantifier SHALL have its own statistics entry
- **AND** statistics SHALL be keyed by quantifier name
- **AND** statistics SHALL be independent across quantifiers

#### Scenario: Statistics with nested quantifiers
- **WHEN** a scenario has nested quantifiers (e.g., forall within exists)
- **THEN** statistics SHALL be collected for each quantifier independently
- **AND** each quantifier's sample count reflects its actual sampling frequency
- **AND** inner quantifiers may have higher sample counts due to nesting

#### Scenario: Statistics during shrinking
- **WHEN** shrinking is performed after finding a counterexample
- **THEN** shrinking statistics SHALL be tracked separately
- **AND** `result.statistics.shrinking` MAY include:
  - `candidatesTested`: number of shrink candidates evaluated
  - `roundsCompleted`: number of shrinking iterations
  - `improvementsMade`: number of times a smaller counterexample was found

### Requirement: Event and Target Collection Points

The system SHALL provide collection points for events and targets during property evaluation.

#### Scenario: Event collection in property
- **WHEN** `fc.event(name)` is called within a `.then()` property function
- **THEN** the current test case SHALL be tagged with that event
- **AND** the event SHALL be accumulated in the statistics context
- **AND** multiple calls to `fc.event()` with the same name in one test case count as one occurrence

#### Scenario: Target collection in property
- **WHEN** `fc.target(observation, label?)` is called within a `.then()` property function
- **THEN** the observation SHALL be recorded in the statistics context
- **AND** the explorer MAY use this feedback for future generation (implementation-dependent)
- **AND** target statistics SHALL be updated with the observation

#### Scenario: Event/target context availability
- **WHEN** property evaluation begins
- **THEN** `fc.event()` and `fc.target()` SHALL be callable
- **AND** they SHALL have access to the current statistics context
- **AND** calling them outside property evaluation SHALL throw an error with a helpful message

### Requirement: Statistics in ExplorationResult

The system SHALL include detailed statistics in the exploration result.

#### Scenario: ExplorationResult with statistics
- **WHEN** detailed statistics are enabled
- **THEN** `ExplorationResult` SHALL include a `detailedStats` field
- **AND** the field SHALL contain:
  - `arbitraryStats`: per-arbitrary statistics
  - `events`: event counts (if any)
  - `targets`: target statistics (if any)

#### Scenario: ExplorationResult without detailed statistics
- **WHEN** detailed statistics are NOT enabled
- **THEN** `ExplorationResult.detailedStats` SHALL be `undefined`
- **AND** the basic fields (testsRun, skipped, labels) SHALL remain unchanged

### Requirement: Statistics Aggregation in FluentCheck

The system SHALL aggregate statistics from exploration in FluentCheck.

#### Scenario: Aggregation process
- **WHEN** `FluentCheck.check()` completes
- **THEN** it SHALL aggregate statistics from `ExplorationResult`
- **AND** it SHALL calculate final metrics (percentages, distributions)
- **AND** it SHALL include aggregated statistics in `FluentResult.statistics`

#### Scenario: Aggregation with exists quantifiers
- **WHEN** a scenario contains `exists` quantifiers
- **THEN** statistics SHALL reflect all attempts, not just successful witnesses
- **AND** the statistics context SHALL track all evaluated combinations

#### Scenario: Aggregation with given predicates
- **WHEN** a scenario contains `given` predicates
- **THEN** `testsDiscarded` SHALL count filtered test cases
- **AND** `arbitraryStats` distribution, unique values, and corner cases SHALL only include values that passed preconditions
- **AND** `samplesGenerated` SHALL include filtered values to track generation efficiency
- **NOTE** This distinction allows analyzing generator efficiency (discard rate) separate from test coverage

### Requirement: Statistics and Strategy Presets

The system SHALL integrate statistics configuration with strategy presets.

#### Scenario: Default strategy preset
- **WHEN** `fc.strategy().defaultStrategy()` is used
- **THEN** detailed statistics SHALL remain disabled
- **AND** verbosity SHALL remain at Normal

#### Scenario: Debug strategy preset
- **WHEN** a debug-oriented preset is used
- **THEN** detailed statistics SHOULD be enabled
- **AND** verbosity SHOULD be set to Debug
- **NOTE** This preset is for investigating test behavior

#### Scenario: Custom strategy with statistics
- **WHEN** `fc.strategy().withDetailedStatistics().withVerbosity(Verbosity.Verbose).build()` is used
- **THEN** all configured options SHALL be active
- **AND** they SHALL combine correctly with other options (bias, shrinking, etc.)

## MODIFIED Requirements

### Requirement: Strategy Factory

The system SHALL provide a `FluentStrategyFactory` for building customized test strategies using a fluent API.

#### Scenario: Create factory
- **WHEN** `fc.strategy()` is called
- **THEN** a new FluentStrategyFactory instance is returned

#### Scenario: Build strategy
- **WHEN** `.build()` is called on the factory
- **THEN** a configured FluentStrategy instance is returned

#### Scenario: Build strategy lazily at check time
- **GIVEN** a FluentCheck scenario configured with a `FluentStrategyFactory`
- **WHEN** `.check()` (or `.assert()`) is called on the scenario
- **THEN** a `FluentStrategy` instance SHALL be built from the configured factory at execution time
- **AND** that instance SHALL be reused for the entire scenario execution

#### Scenario: Factory method additions
- **WHEN** `FluentStrategyFactory` is extended
- **THEN** it SHALL provide:
  - `withDetailedStatistics(): this` - enables detailed statistics
  - `withVerbosity(level: Verbosity): this` - sets verbosity level
  - Both methods SHALL support fluent chaining

#### Scenario: Factory internal state
- **WHEN** factory methods are called
- **THEN** the factory SHALL store:
  - `detailedStatistics: boolean` (default: false)
  - `verbosity: Verbosity` (default: Normal)
- **AND** this state SHALL be used when building the strategy

#### Scenario: Factory build with statistics
- **WHEN** `factory.build()` is called with detailed statistics enabled
- **THEN** the resulting `FluentStrategy` SHALL include statistics configuration
- **AND** the strategy SHALL create appropriate tracking structures

### Requirement: Explorer Interface

The system SHALL provide an `Explorer<Rec>` interface for navigating the search space of a scenario.

#### Scenario: Explore method signature
- **WHEN** an Explorer is used
- **THEN** it SHALL accept a scenario, property function, sampler, and budget
- **AND** it SHALL return an ExplorationResult

#### Scenario: Explorer is stateless
- **WHEN** an Explorer explores a scenario
- **THEN** the Explorer instance SHALL NOT retain state between explorations

#### Scenario: Explorer with statistics context
- **WHEN** detailed statistics are enabled
- **THEN** the Explorer's `explore()` method SHALL receive a statistics context
- **AND** the Explorer SHALL populate the context during exploration
- **AND** the context SHALL be returned as part of `ExplorationResult`

#### Scenario: AbstractExplorer statistics hooks
- **WHEN** `AbstractExplorer` is extended for statistics
- **THEN** it SHALL provide hooks for:
  - `onSample(quantifierName, value)` - called when a value is sampled
  - `onEvaluate(testCase)` - called before property evaluation
  - `onResult(testCase, passed)` - called after property evaluation

### Requirement: Sampler Interface

The system SHALL provide a `Sampler` interface for generating samples from arbitraries.

#### Scenario: Sample method
- **WHEN** `sampler.sample(arbitrary, count)` is called
- **THEN** it SHALL return an array of `FluentPick` values
- **AND** the array length SHALL be at most `count`

#### Scenario: Sample with bias method
- **WHEN** `sampler.sampleWithBias(arbitrary, count)` is called
- **THEN** it SHALL include corner cases from the arbitrary
- **AND** remaining samples SHALL be randomly generated

#### Scenario: Sample unique method
- **WHEN** `sampler.sampleUnique(arbitrary, count)` is called
- **THEN** it SHALL return only unique values
- **AND** uniqueness SHALL be determined by the arbitrary's equals function

#### Scenario: Sampler with statistics
- **WHEN** detailed statistics are enabled and the sampler generates a value
- **THEN** the sampler MAY record distribution data
- **AND** this data SHALL be aggregated with explorer statistics

#### Scenario: Sampler statistics delegation
- **WHEN** sampler decorators are composed (Biased → Cached → Deduping)
- **THEN** statistics collection SHALL occur at the appropriate layer
- **AND** deduplication SHALL be counted before filtering
- **AND** cache hits vs. generations SHALL be distinguishable (in Debug mode)
