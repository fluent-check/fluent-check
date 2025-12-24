## MODIFIED Requirements

### Requirement: Check Execution

The system SHALL provide a `check()` method that executes the property-based test and returns a result, while cleanly separating execution from reporting and logging concerns.

#### Scenario: Execute property test
- **WHEN** `.check()` is called
- **THEN** test cases SHALL be generated according to the configured strategy (Explorer, Shrinker, Sampler, and budgets)
- **AND** a `FluentResult` SHALL be returned with:
  - `satisfiable` boolean
  - `example` containing the witness or counterexample (unwrapped from FluentPick)
  - `seed` for reproducibility
  - `statistics` describing execution metrics

#### Scenario: Check orchestration responsibilities
- **WHEN** `check()` orchestrates execution
- **THEN** it SHALL:
  - Build the execution engine from the configured strategy (Explorer, Shrinker, Sampler, budgets, RNG)
  - Execute exploration (and shrinking if necessary)
  - Aggregate raw execution data into `FluentStatistics` using a dedicated `StatisticsAggregator`
  - Construct and return a `FluentResult`
- **AND** it SHALL NOT perform formatting, console output, or framework-specific assertions directly

#### Scenario: Check without observers
- **WHEN** `.check()` is called without any progress or reporting options
- **THEN** the method SHALL execute the property and return a fully-populated `FluentResult`
- **AND** NO progress, logging, or reporting side effects SHALL be produced by default
- **AND** callers SHALL be able to rely solely on assertions over the structured `FluentResult` object

#### Scenario: Observer-based reporting and progress
- **WHEN** progress and reporting are enabled via options
- **THEN** `check()` SHALL delegate to injected observers (e.g., `ProgressReporter`, `ResultReporter`, `Logger`) for:
  - Emitting progress updates
  - Formatting and outputting statistics
  - Logging warnings and debug information
- **AND** the semantics of `FluentResult` and `FluentStatistics` SHALL remain unchanged regardless of observers

