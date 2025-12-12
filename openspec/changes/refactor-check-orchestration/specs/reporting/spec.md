## ADDED Requirements

### Requirement: Reporting Observers

The system SHALL implement reporting and progress as injectable observers, decoupled from core execution.

#### Scenario: ProgressReporter interface
- **WHEN** progress reporting is required
- **THEN** the system SHALL provide a `ProgressReporter` interface with:
  - `onProgress(progress: ProgressInfo): void`
  - `onFinal(progress: ProgressInfo): void`
- **AND** default implementations SHALL include:
  - `NoopProgressReporter` that performs no side effects
  - `CallbackProgressReporter` that wraps `CheckOptions.onProgress`
  - `ThrottlingProgressReporter` that decorates another reporter and enforces interval/time-based throttling

#### Scenario: ResultReporter interface
- **WHEN** result reporting is required
- **THEN** the system SHALL provide a `ResultReporter<Rec>` interface with:
  - `onComplete(result: FluentResult<Rec>): void`
- **AND** default implementations SHALL include:
  - `NoopResultReporter` that performs no side effects
  - `ConsoleStatisticsReporter` that uses `FluentReporter.formatStatistics` and writes to console
  - `LoggerStatisticsReporter` that emits structured `LogEntry` objects via a `Logger`

#### Scenario: Default no-op observers
- **WHEN** no reporting or progress options are provided
- **THEN** `FluentCheck.check()` SHALL construct no-op reporters
- **AND** running `check()` SHALL produce **only** the returned `FluentResult` as observable output

#### Scenario: Mapping from CheckOptions to reporters
- **WHEN** `CheckOptions` are provided to `.check()`
- **THEN** the system SHALL map them to reporters as follows:
  - If `onProgress` is undefined, use `NoopProgressReporter`
  - If `onProgress` is defined, wrap it in `CallbackProgressReporter`
  - If `progressInterval` is defined, wrap the progress reporter in `ThrottlingProgressReporter`
  - If `logStatistics` is false/undefined, use `NoopResultReporter`
  - If `logStatistics` is true and `logger` is undefined, use `ConsoleStatisticsReporter`
  - If `logStatistics` is true and `logger` is defined, use `LoggerStatisticsReporter`

#### Scenario: Verbosity and histograms in reporters
- **WHEN** verbosity (`Verbosity`) and histogram options are configured
- **THEN** reporters SHALL use these to decide:
  - Whether to output statistics at all (Quiet vs. Normal vs. Verbose vs. Debug)
  - Whether to include detailed per-arbitrary statistics
  - Whether to include histogram visualizations
- **AND** `FluentCheck` itself SHALL NOT contain logic that formats or prints statistics directly

#### Scenario: Compatibility with FluentReporter
- **WHEN** `FluentReporter` is used for error messages and manual formatting
- **THEN** reporters MAY delegate to `FluentReporter.formatStatistics` for generating text/markdown/JSON
- **AND** this delegation SHALL be encapsulated inside reporter implementations, not inside `FluentCheck`

