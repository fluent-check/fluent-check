# Change: Refactor Check Orchestration, Progress, and Reporting

## Why

The current `FluentCheck.check()` implementation mixes multiple responsibilities:

- Orchestrating the exploration and shrinking engines
- Aggregating raw execution data into `FluentStatistics`
- Emitting progress callbacks with throttling logic
- Formatting and logging statistics based on verbosity, histograms, and logger options

This leads to:

- High cyclomatic complexity, making the core execution path hard to reason about
- Tight coupling between core execution and output concerns (console, logger, formatting)
- Limited extensibility for alternative reporting/progress strategies
- Difficulty for users who only want to assert on the structured `FluentResult` and avoid any side effects

We want a cleaner architecture where:

- `FluentCheck` orchestrates execution and returns a rich `FluentResult` (single responsibility)
- Statistics aggregation is a pure, testable service
- Progress and reporting are implemented as injectable observers that can be omitted entirely
- Logging is structured and routed through a configurable `Logger`, not hard-coded console calls

## What Changes

- Introduce a `StatisticsAggregator` abstraction responsible for turning raw exploration/shrinking data into `FluentStatistics`
- Introduce `ProgressReporter` and `ResultReporter` interfaces as observer ports for progress and result reporting
- Refactor `FluentCheck.check()` to:
  - Use the engine layer (Explorer/Shrinker/Sampler/Scenario) + `StatisticsAggregator`
  - Depend on injected reporters instead of directly writing to console or calling callbacks
  - Always return a `FluentResult` independent of observers
- Map existing `CheckOptions` (`onProgress`, `progressInterval`, `logStatistics`, `verbose`, `logger`, etc.) to default reporter implementations:
  - A throttled progress reporter that wraps `onProgress`
  - A console or logger-backed result reporter for statistics output
- Ensure all statistics computation remains deterministic and side-effect-free, while observers handle presentation and logging

## Impact

- **Affected specs**: `fluent-api`, `reporting`, `statistics`
- **Affected code**: `FluentCheck`, `FluentResult`, `FluentReporter`, statistics aggregation helpers, any direct console/progress logic in `check()`
- **Breaking changes**: None intended at the API level; behavior of `check()` and `FluentResult` remains the same from a user perspective, but internal architecture and extension points change
- **Extension points**:
  - Custom `StatisticsAggregator` for alternative statistics strategies (e.g., different quantile algorithms)
  - Custom `ProgressReporter` implementations (e.g., UI progress bars, CI log hooks)
  - Custom `ResultReporter` implementations (e.g., JSON dashboards, metrics pipelines)

## Architecture Overview

### Layers

- **Engine layer (existing)**  
  Explorer, Shrinker, Sampler, Scenario, RNG, `StatisticsContext`  
  *Responsibility:* execute the property over generated inputs, find witnesses/counterexamples, and collect raw statistics.

- **Aggregation layer (new)**  
  `StatisticsAggregator`  
  *Responsibility:* convert raw counts, labels, detailed stats, and shrinking metrics into a normalized `FluentStatistics` object.

- **Orchestration layer (refined)**  
  `FluentCheck`  
  *Responsibility:* wire the engine + aggregator + observers; run exploration/shrinking; build and return `FluentResult`.

- **Observer layer (new)**  
  `ProgressReporter`, `ResultReporter`, `Logger`  
  *Responsibility:* optional, side-effecting clients for progress, reporting, and logging. Core behavior does not depend on their presence.

### Ports and Adapters

- **Ports**
  - `StatisticsAggregator` – how stats are computed from raw data
  - `ProgressReporter` – where progress notifications go
  - `ResultReporter` – where final results/stats are reported
  - `Logger` – where structured log entries go

- **Default adapters**
  - Default `StatisticsAggregator` that matches current `FluentStatistics` semantics
  - Composition of `ProgressReporter` from `CheckOptions.onProgress` and `CheckOptions.progressInterval`
  - Composition of `ResultReporter` from `CheckOptions.logStatistics`, `CheckOptions.verbose`, and `CheckOptions.logger`

## Implementation Notes

- `FluentCheck.check()`:
  - MUST construct or receive a `StatisticsAggregator`
  - MUST construct a `ProgressReporter` from options (or use a no-op reporter)
  - MUST construct a `ResultReporter` from options (or use a no-op reporter)
  - MUST NOT contain any direct `console.*` calls; these belong in reporters or `Logger` implementations
  - SHOULD pass a progress adapter to `Explorer.explore()` that forwards to `ProgressReporter.onProgress`
  - MUST call `ProgressReporter.onFinal()` once per `check()` call
  - MUST call `ResultReporter.onComplete(result)` once per `check()` call

- `StatisticsContext`:
  - Continues to own event/target tracking and per-arbitrary stats
  - MAY use `Logger` for internal warnings and debug messages (e.g., invalid target observations)
  - MUST NOT format human-readable output; it only emits structured log entries

- Default behavior:
  - If no reporters/logging options are provided, `check()` MUST still return a fully-populated `FluentResult` and perform **no** side effects beyond normal execution
  - Existing examples that rely on `logStatistics` and `Verbosity` MUST continue to function, now backed by `ResultReporter` implementations

