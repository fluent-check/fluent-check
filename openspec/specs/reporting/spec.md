# Reporting

## Purpose

Test result reporting and assertion integration for property-based tests. Provides structured results containing success/failure status, examples or counterexamples, and reproducibility seeds, along with an expect function for seamless test framework integration.
## Requirements
### Requirement: FluentResult

The system SHALL provide a `FluentResult` class containing test execution outcomes.

#### Scenario: Success result
- **WHEN** a property is satisfied
- **THEN** `result.satisfiable` SHALL be `true`
- **AND** `result.example` contains a satisfying example

#### Scenario: Failure result
- **WHEN** a property is not satisfied
- **THEN** `result.satisfiable` SHALL be `false`
- **AND** `result.example` contains the shrunk counterexample

#### Scenario: Seed included
- **WHEN** a test completes
- **THEN** `result.seed` contains the seed used for reproduction

### Requirement: Expect Function

The system SHALL provide an `expect(result)` function for assertion integration.

#### Scenario: Pass on satisfiable
- **WHEN** `expect(result)` is called with a satisfiable result
- **THEN** no error is thrown

#### Scenario: Throw on unsatisfiable
- **WHEN** `expect(result)` is called with an unsatisfiable result
- **THEN** a `FluentReporter` error is thrown

### Requirement: FluentReporter Error

The system SHALL provide a `FluentReporter` error class for test framework integration.

#### Scenario: Error name
- **WHEN** a FluentReporter error is thrown
- **THEN** its name SHALL be "Property not satisfiable"

#### Scenario: Error message
- **WHEN** a FluentReporter error is thrown
- **THEN** its message SHALL include the counterexample as JSON
- **AND** the error message SHALL include a summary of statistics when verbosity is `Verbose` or `Debug`
- **AND** the statistics summary SHALL include tests run, time, and key metrics

#### Scenario: Error message structure
- **WHEN** a FluentReporter error is constructed
- **THEN** the error message SHALL have this structure:
  1. Headline: "Property not satisfiable"
  2. Counterexample (JSON formatted)
  3. Seed for reproduction
  4. Statistics summary (if verbose)
  5. Shrinking info (if shrinking was performed)

#### Scenario: Seed in error message
- **WHEN** a FluentReporter error is thrown
- **THEN** the seed SHALL always be included
- **AND** the format SHALL show how to reproduce: `Seed: 12345 (use .withSeed(12345) to reproduce)`

### Requirement: Example Unwrapping

The system SHALL unwrap FluentPick values to plain values in results.

#### Scenario: Unwrap picks
- **WHEN** a result is returned from `check()`
- **THEN** `result.example` contains plain values, not FluentPick wrappers
- **AND** values are accessible by their bound variable names

### Requirement: FluentStatistics Interface

The system SHALL provide a FluentStatistics interface for test execution metrics.

#### Scenario: Basic statistics fields
- **WHEN** a test completes
- **THEN** `statistics.testsRun` SHALL be a number representing total tests executed
- **AND** `statistics.testsPassed` SHALL be a number representing tests that passed
- **AND** `statistics.testsDiscarded` SHALL be a number representing filtered tests
- **AND** `statistics.executionTimeMs` SHALL be a number representing execution time

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

### Requirement: Verbosity Configuration

The system SHALL provide configurable verbosity levels for test output.

#### Scenario: Verbosity enum
- **WHEN** verbosity is configured
- **THEN** the system SHALL support four verbosity levels:
  - `Quiet = 0`: No output except thrown errors
  - `Normal = 1`: Default; counterexamples and coverage failures only
  - `Verbose = 2`: Progress updates, statistics summary, and all classifications
  - `Debug = 3`: All verbose output plus internal state and generation details

#### Scenario: Verbosity in strategy
- **WHEN** `fc.strategy().withVerbosity(Verbosity.Verbose)` is called
- **THEN** the strategy SHALL store the verbosity level
- **AND** the verbosity SHALL be used during test execution

#### Scenario: Default verbosity
- **WHEN** verbosity is not explicitly configured
- **THEN** the system SHALL use `Verbosity.Normal` as the default
- **AND** only counterexamples and coverage failures SHALL be reported

### Requirement: Quiet Output

The system SHALL suppress all output in Quiet mode.

#### Scenario: Quiet mode behavior
- **WHEN** verbosity is set to `Quiet`
- **THEN** no output SHALL be written to console during test execution
- **AND** no progress updates SHALL be emitted
- **AND** errors SHALL still be thrown on failure (but not logged)
- **AND** enabling `logStatistics` SHALL NOT produce output (Quiet mode wins)

### Requirement: Normal Output

The system SHALL provide minimal, actionable output in Normal mode.

#### Scenario: Normal mode on success
- **WHEN** verbosity is `Normal` and the property passes
- **THEN** no output SHALL be written to console
- **AND** statistics SHALL only be available via `result.statistics`

#### Scenario: Normal mode on failure
- **WHEN** verbosity is `Normal` and the property fails
- **THEN** the counterexample SHALL be reported
- **AND** the shrunk counterexample SHALL be shown (if shrinking is enabled)
- **AND** basic test counts SHALL be shown (tests run, passed, discarded)

#### Scenario: Normal mode on coverage failure
- **WHEN** verbosity is `Normal` and coverage requirements are not met
- **THEN** the failing coverage requirements SHALL be reported
- **AND** observed vs. required percentages SHALL be shown

### Requirement: Verbose Output

The system SHALL provide comprehensive output in Verbose mode.

#### Scenario: Verbose output content
- **WHEN** verbosity is set to `Verbose`
- **THEN** the system SHALL output:
  - Progress updates at configurable intervals (default: every 100 tests or 1 second)
  - Final statistics summary including all label/classification counts
  - Event counts and percentages (if any events were recorded)
  - Target best scores (if any targets were recorded)
  - Execution time breakdown

#### Scenario: Verbose progress format
- **WHEN** progress is reported in Verbose mode
- **THEN** the format SHALL include:
  - Tests run / total (e.g., "500/1000 tests")
  - Percentage complete
  - Current pass/fail/discard counts
  - Elapsed time

#### Scenario: Verbose statistics summary
- **WHEN** test execution completes in Verbose mode
- **THEN** a statistics summary SHALL be output containing:
  - Total tests run, passed, discarded
  - Execution time (total and breakdown if available)
  - Label distribution table (if labels exist)
  - Event distribution table (if events exist)
  - Target scores table (if targets exist)

### Requirement: Debug Output

The system SHALL provide detailed internal information in Debug mode.

#### Scenario: Debug output content
- **WHEN** verbosity is set to `Debug`
- **THEN** the system SHALL output all Verbose content plus:
  - Per-arbitrary sampling details (values generated, unique count)
  - Shrinking progress (candidates tested, rounds completed)
  - Explorer state transitions
  - Memory usage estimates
  - RNG seed used

#### Scenario: Debug arbitrary sampling
- **WHEN** Debug mode is active during sampling
- **THEN** each generated value MAY be logged
- **AND** corner case hits SHALL be highlighted
- **AND** duplicate detection events SHALL be logged

### Requirement: Enhanced FluentReporter

The system SHALL provide enhanced reporting capabilities for detailed statistics.

#### Scenario: Format statistics method signature
- **WHEN** `FluentReporter.formatStatistics(statistics, options?)` is called
- **THEN** it SHALL return a formatted string representation of statistics
- **AND** options SHALL include:
  - `format`: `'text' | 'markdown' | 'json'` (default: `'text'`)
  - `detailed`: `boolean` (default: `false`)
  - `includeHistograms`: `boolean` (default: `false`)
  - `maxLabelRows`: `number` (default: `20`)

#### Scenario: Text format output
- **WHEN** format is `'text'` or not specified
- **THEN** the output SHALL use plain text formatting
- **AND** it SHALL be human-readable in a terminal
- **AND** it SHALL use consistent spacing and alignment
- **AND** it SHALL respect terminal width where possible

#### Scenario: Markdown format output
- **WHEN** format is set to `'markdown'`
- **THEN** the output SHALL use GitHub-flavored markdown:
  - `##` headers for sections
  - Tables for statistics with `|` separators
  - Code blocks for examples
  - Bullet lists for distributions

#### Scenario: JSON format output
- **WHEN** format is set to `'json'`
- **THEN** the output SHALL be valid, parseable JSON
- **AND** it SHALL include all statistics fields
- **AND** it SHALL use camelCase property names
- **AND** numeric values SHALL NOT be stringified

#### Scenario: Detailed statistics formatting
- **WHEN** `detailed: true` is specified and arbitraryStats exist
- **THEN** the formatted output SHALL include:
  - Per-arbitrary statistics table
  - Distribution summaries (min, max, mean, median, q1, q3, stdDev)
  - Corner case coverage (tested / total)
  - Unique value counts

#### Scenario: Histogram output
- **WHEN** `includeHistograms: true` is specified
- **THEN** the output SHALL include ASCII histograms for:
  - Numeric distributions (binned by range)
  - Array/string length distributions
  - Label frequencies

#### Scenario: Histogram format (text)
- **WHEN** histograms are included in text format
- **THEN** they SHALL use ASCII bar characters (e.g., `█`, `▓`, `░`)
- **AND** bins SHALL be labeled with ranges
- **AND** counts/percentages SHALL be shown

```
Array lengths:
  0-5   ████████████████ 45%
  6-10  ██████████ 28%
  11-15 █████ 15%
  16-20 ███ 9%
  21+   █ 3%
```

#### Scenario: Label truncation
- **WHEN** there are more labels than `maxLabelRows`
- **THEN** only the top N labels by count SHALL be shown
- **AND** a note SHALL indicate how many labels were omitted

### Requirement: Statistics Logging

The system SHALL support optional logging of statistics during test execution.

#### Scenario: Log statistics option
- **WHEN** `logStatistics: true` is passed to `.check()`
- **THEN** statistics SHALL be logged to console after test completion
- **AND** the format SHALL respect the configured verbosity level:
  - `Quiet`: No logging
  - `Normal`: Summary only (tests run, time, pass/fail)
  - `Verbose`: Full statistics with labels and events
  - `Debug`: Full statistics plus arbitrary details

#### Scenario: Custom logger
- **WHEN** a custom logger is provided via `logger` option
- **THEN** all output SHALL be sent to that logger instead of console
- **AND** the logger SHALL receive structured log objects, not formatted strings

### Requirement: Progress Callbacks

The system SHALL support progress callbacks for long-running tests.

#### Scenario: Progress callback option
- **WHEN** `onProgress: (progress) => void` is passed to `.check()`
- **THEN** the callback SHALL be invoked periodically during test execution
- **AND** invocation frequency SHALL be configurable via `progressInterval` option

#### Scenario: Progress object structure
- **WHEN** the progress callback is invoked
- **THEN** `progress` SHALL contain:
  - `testsRun`: number of tests executed so far
  - `totalTests`: total tests planned (may be undefined for unbounded)
  - `percentComplete`: percentage (0-100) if totalTests is known
  - `testsPassed`: tests passed so far
  - `testsDiscarded`: tests discarded so far
  - `elapsedMs`: milliseconds since test start
  - `currentPhase`: `'exploring' | 'shrinking'`

#### Scenario: Progress interval default
- **WHEN** `onProgress` is provided but `progressInterval` is not
- **THEN** the default interval SHALL be 100 tests or 1000ms, whichever comes first

#### Scenario: Progress callback errors
- **WHEN** the progress callback throws an error
- **THEN** the error SHALL be caught and logged (if verbosity >= Normal)
- **AND** test execution SHALL continue
- **AND** further progress callbacks SHALL be skipped for that test run

### Requirement: FluentResult Assertion Messages

The system SHALL provide detailed assertion messages.

#### Scenario: assertSatisfiable message
- **WHEN** `result.assertSatisfiable()` throws
- **THEN** the error message SHALL include:
  - The counterexample
  - The seed
  - A hint to use `.withSeed()` for reproduction

#### Scenario: assertNotSatisfiable message
- **WHEN** `result.assertNotSatisfiable()` throws (because property was satisfiable)
- **THEN** the error message SHALL include:
  - The satisfying example found
  - Number of tests run before finding it

#### Scenario: Custom assertion message
- **WHEN** `result.assertSatisfiable(message)` is called with a custom message
- **THEN** the custom message SHALL be prepended to the default error details

