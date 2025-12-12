# Reporting, Progress, and Statistics Aggregation

FluentCheck separates core test execution from reporting and logging. This makes it easy to:

- Use `.check()` purely as a data API
- Log statistics to the console or a custom logger
- Plug in custom progress and result reporters
- Experiment with alternative statistics aggregation strategies

## Using `check()` as a data API

By default, `check()` has no reporting side effects. If you don’t pass any reporting options, it simply returns a `FluentResult`:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check() // no progress callbacks, no logging

// Assert on structured data only
expect(result.satisfiable).to.equal(true)
expect(result.statistics.testsRun).to.equal(1000)
```

No console output is produced unless you explicitly enable logging options.

## Logging statistics

Statistics reporting is implemented via `ResultReporter` implementations:

- `NoopResultReporter` – default when `logStatistics` is not enabled
- `ConsoleStatisticsReporter` – uses `FluentReporter.formatStatistics` and writes to `console`
- `LoggerStatisticsReporter` – sends structured `LogEntry` objects to a `Logger`

The mapping from `CheckOptions` to reporters is:

- `logStatistics` false/undefined → `NoopResultReporter`
- `logStatistics` true and `logger` undefined → `ConsoleStatisticsReporter`
- `logStatistics` true and `logger` defined → `LoggerStatisticsReporter`
- Any mode with `Verbosity.Quiet` → no statistics output

```typescript
// Console statistics (default logger)
fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({logStatistics: true}) // formatted report printed to console

// Structured statistics via custom logger
const logger: fc.Logger = {
  log(entry) {
    if (entry.message === 'statistics') {
      sendToMetrics(entry.data!.statistics)
    }
  }
}

fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({logStatistics: true, logger})
```

Verbosity controls how much detail is included:

- `Verbosity.Quiet` – no statistics output
- `Verbosity.Normal` – summary only
- `Verbosity.Verbose` – detailed statistics
- `Verbosity.Debug` – detailed statistics plus histograms

## Progress reporting

Progress reporting is implemented via `ProgressReporter` implementations:

- `NoopProgressReporter` – default when no progress options are provided
- `CallbackProgressReporter` – wraps `CheckOptions.onProgress`
- `ThrottlingProgressReporter` – decorates another reporter and enforces interval/time-based throttling

`ProgressInfo` has the shape:

```typescript
interface ProgressInfo {
  testsRun: number
  totalTests?: number
  percentComplete?: number
  testsPassed: number
  testsDiscarded: number
  elapsedMs: number
  currentPhase: 'exploring' | 'shrinking'
}
```

The default mapping from `CheckOptions` to progress reporters is:

- `onProgress` undefined → `NoopProgressReporter`
- `onProgress` defined → `CallbackProgressReporter`
- `progressInterval` defined → `ThrottlingProgressReporter` wrapping the callback reporter

```typescript
// Simple textual progress updates
fc.scenario()
  .config(fc.strategy().withSampleSize(10_000))
  .forall('x', fc.integer())
  .then(({x}) => expensiveCheck(x))
  .check({
    onProgress(progress) {
      if (progress.percentComplete !== undefined) {
        process.stdout.write(
          `\r${progress.testsRun}/${progress.totalTests} ` +
          `(${progress.percentComplete.toFixed(1)}%)`
        )
      }
    },
    progressInterval: 500 // every 500 tests (or 1s by default)
  })
```

Errors thrown from the progress callback are caught and reported via the configured `Logger` (if any) and do not interrupt test execution.

## Statistics aggregation

Statistics aggregation is handled by the `StatisticsAggregator` abstraction. The default implementation is `DefaultStatisticsAggregator`.

`FluentCheck.check()` passes a `StatisticsAggregationInput` to the aggregator:

```typescript
interface StatisticsAggregationInput {
  testsRun: number
  skipped: number
  executionTimeMs: number
  counterexampleFound: boolean
  executionTimeBreakdown: { exploration: number; shrinking: number }
  labels?: Record<string, number>
  detailedStats?: DetailedExplorationStats
  shrinkingStats?: ShrinkingStatistics
}
```

The default aggregator produces a `FluentStatistics` object that:

- Preserves the invariants:
  - Satisfiable: `testsRun = testsPassed + testsDiscarded`
  - Unsatisfiable: `testsRun = testsPassed + testsDiscarded + 1`
- Computes label and event percentages when counts are present
- Passes through detailed per-arbitrary, event, target, and shrinking statistics

## Replacing `DefaultStatisticsAggregator`

For experimental statistics behavior, you can provide a custom aggregator via `CheckOptions.statisticsAggregator`:

```typescript
class MyAggregator implements fc.StatisticsAggregator {
  constructor(
    private readonly inner: fc.StatisticsAggregator = new fc.DefaultStatisticsAggregator()
  ) {}

  aggregate(input: fc.StatisticsAggregationInput): fc.FluentStatistics {
    const stats = this.inner.aggregate(input)
    // Example: round percentages for display-only use
    if (stats.labelPercentages !== undefined) {
      for (const key of Object.keys(stats.labelPercentages)) {
        stats.labelPercentages[key] = Math.round(stats.labelPercentages[key]!)
      }
    }
    return stats
  }
}

const result = fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({statisticsAggregator: new MyAggregator()})
```

Custom aggregators should remain pure and preserve the core invariants of `FluentStatistics`, but can freely change how derived metrics are computed.

## Advanced reporter customization

For advanced use cases (custom UIs, dashboards, or deep integration with other tooling), `check()` exposes factory hooks:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({
    // Customize or replace the progress reporter
    progressReporterFactory: ({options, logger, defaultFactory}) => {
      const base = defaultFactory(options, logger)
      return {
        onProgress(progress) {
          updateUiProgress(progress)
          base.onProgress(progress)
        },
        onFinal(progress) {
          finalizeUi(progress)
          base.onFinal(progress)
        }
      }
    },

    // Customize or replace the result reporter
    resultReporterFactory: ({options, effectiveVerbosity, logger, defaultFactory}) => {
      const base = defaultFactory(options, effectiveVerbosity, logger)
      return {
        onComplete(result) {
          emitJsonStatistics(result.statistics)
          base.onComplete(result)
        }
      }
    }
  })
```

These factories receive:

- The original `CheckOptions`
- The effective verbosity and logger
- A `defaultFactory` function that reproduces FluentCheck’s built-in behavior

This lets you layer additional behavior on top of the defaults or completely replace them, while keeping the core check orchestration unchanged.

