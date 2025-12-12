# Tasks: Refactor Check Orchestration, Progress, and Reporting

## 1. Design and Abstractions

- [x] 1.1 Define `StatisticsAggregator` interface and default implementation
- [x] 1.2 Define `ProgressReporter` interface and basic implementations:
  - [x] 1.2.1 `NoopProgressReporter`
  - [x] 1.2.2 `CallbackProgressReporter` that wraps `CheckOptions.onProgress`
  - [x] 1.2.3 `ThrottlingProgressReporter` that decorates another reporter
- [x] 1.3 Define `ResultReporter<Rec>` interface and basic implementations:
  - [x] 1.3.1 `NoopResultReporter`
  - [x] 1.3.2 `ConsoleStatisticsReporter` using `FluentReporter.formatStatistics`
  - [x] 1.3.3 `LoggerStatisticsReporter` emitting structured `LogEntry` via `Logger`
- [x] 1.4 Confirm `Logger`, `LogEntry`, and `LogLevel` types are reusable and live in a stable module (`statistics` or a small shared types module)

## 2. Wire Aggregation into FluentCheck

- [x] 2.1 Extract current statistics aggregation logic from `FluentCheck.check()` into `DefaultStatisticsAggregator.aggregate`
- [x] 2.2 Replace inline statistics construction with a single call to the aggregator
- [x] 2.3 Ensure `FluentStatistics` shape and semantics (testsRun, testsPassed, testsDiscarded, labels, events, targets, shrinking) are unchanged
- [x] 2.4 Add unit tests for `DefaultStatisticsAggregator` to validate aggregation behavior in isolation

## 3. Wire Progress Reporting into FluentCheck

- [x] 3.1 Replace direct `onProgress` handling in `FluentCheck.check()` with a single `ProgressReporter` instance
- [x] 3.2 Build `ProgressReporter` from `CheckOptions`:
  - [x] 3.2.1 If `onProgress` is undefined, use `NoopProgressReporter`
  - [x] 3.2.2 If `onProgress` is defined, wrap it with `CallbackProgressReporter`
  - [x] 3.2.3 If `progressInterval` is defined, wrap with `ThrottlingProgressReporter`
- [x] 3.3 Ensure `Explorer.explore()` receives a thin adapter that forwards its raw progress payload into `ProgressReporter.onProgress`
- [x] 3.4 Ensure `ProgressReporter.onFinal()` is called once per `check()` execution with final `ProgressInfo`
- [x] 3.5 Verify behavior for:
  - [x] 3.5.1 No progress callback (no-op)
  - [x] 3.5.2 Progress callback with interval-based throttling
  - [x] 3.5.3 Exceptions thrown from the callback (SHALL be caught and reported via `Logger`, not crash the run)

## 4. Wire Result Reporting into FluentCheck

- [x] 4.1 Replace direct `logStatistics` + verbosity + console logic in `FluentCheck.check()` with a `ResultReporter<Rec>`
- [x] 4.2 Map existing options to reporters:
  - [x] 4.2.1 If `logStatistics` is false/undefined, use `NoopResultReporter`
  - [x] 4.2.2 If `logStatistics` is true and `logger` is undefined, use `ConsoleStatisticsReporter`
  - [x] 4.2.3 If `logStatistics` is true and `logger` is defined, use `LoggerStatisticsReporter`
  - [x] 4.2.4 Pass verbosity and histogram preferences into reporters (do not let `FluentCheck` decide formatting)
- [x] 4.3 Ensure `ResultReporter.onComplete(result)` is always called exactly once per `check()` invocation
- [x] 4.4 Verify existing examples that rely on `logStatistics` and `Verbosity` still behave as before (now via reporters)
- [x] 4.5 Verify Quiet mode (Verbosity.Quiet) still produces no output even when `logStatistics` is true

## 5. Logging and StatisticsContext Integration

- [x] 5.1 Ensure `StatisticsContext` uses `Logger` for structured warnings (e.g., invalid target observations) instead of direct console calls
- [x] 5.2 Ensure event payload debug logging (for `fc.event(name, payload)`) flows through `Logger` when verbosity >= Debug
- [x] 5.3 Confirm that logging from `StatisticsContext` is independent of `ResultReporter` (internal telemetry vs. external reporting)

## 6. Backwards Compatibility and API Surface

- [x] 6.1 Keep `CheckOptions` shape backwards compatible:
  - `logStatistics`, `verbose`, `onProgress`, `progressInterval`, and `logger` MUST maintain their semantics
- [x] 6.2 Optionally introduce advanced, low-level hooks (e.g., `progressReporterFactory`, `resultReporterFactory`) without breaking existing options
- [x] 6.3 Ensure public API surface does NOT expose engine internals (Explorer, Shrinker) beyond what is already documented
- [x] 6.4 Add documentation for new abstractions and how they map to existing options

## 7. Documentation and Examples

- [x] 7.1 Update reporting documentation to describe:
  - `StatisticsAggregator` role
  - `ProgressReporter` and `ResultReporter` patterns
  - How verbosity and `logStatistics` map to reporters
- [x] 7.2 Add examples for:
  - [x] 7.2.1 Using `check()` purely as a data API (no progress, no logging)
  - [x] 7.2.2 Custom progress reporting (e.g., integrating with a test runner’s progress UI)
  - [x] 7.2.3 Custom result reporting (e.g., exporting JSON stats to a file or metrics system)
- [x] 7.3 Document how to replace `DefaultStatisticsAggregator` for experimental statistics behavior

## 8. Validation

- [x] 8.1 Run existing test suite to verify behavior unchanged for:
  - Basic `check()` and `checkCoverage()` flows
  - Detailed statistics, events, targets, and histograms
  - Verbosity modes (Quiet, Normal, Verbose, Debug)
- [x] 8.2 Add targeted tests for:
  - [x] 8.2.1 `StatisticsAggregator` invariants
  - [x] 8.2.2 `ProgressReporter` throttling and error handling
  - [x] 8.2.3 `ResultReporter` behavior under different verbosity/logger combinations
