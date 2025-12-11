# Change: Add Detailed Statistics and Enhanced Reporting

> **GitHub Issue:** [#419](https://github.com/fluent-check/fluent-check/issues/419)

## Why

For advanced analysis and debugging, users need detailed per-arbitrary statistics, distribution tracking, and configurable verbosity. This is opt-in functionality for power users who need deep visibility into test execution.

This feature completes the statistical ergonomics implementation with advanced capabilities like arbitrary statistics, streaming quantile estimation, targeted testing, and enhanced reporting.

## What Changes

- Add `withDetailedStatistics()` strategy option
- Add `ArbitraryStatistics` interface for per-arbitrary metrics
- Add `Verbosity` enum and `withVerbosity()` configuration
- Implement streaming quantile algorithm for distribution tracking
- Add `event()` function for ad-hoc occurrence tracking
- Add `target()` function for coverage-guided optimization
- Enhance `FluentReporter` with statistical formatting

### Architecture Context

The current codebase has a clear separation of concerns:
- **Explorer** (`src/strategies/Explorer.ts`) - Handles test case exploration and traversal
- **Shrinker** (`src/strategies/Shrinker.ts`) - Handles counterexample minimization
- **Sampler** (`src/strategies/Sampler.ts`) - Handles value generation from arbitraries
- **FluentCheck** (`src/FluentCheck.ts`) - Orchestrates execution and collects statistics

Statistics collection happens in `FluentCheck.check()` which:
1. Builds Explorer and Shrinker from `FluentStrategyFactory`
2. Calls `explorer.explore()` which returns `ExplorationResult` with `testsRun`, `skipped`, and `labels`
3. Calculates `FluentStatistics` from exploration results
4. Returns `FluentResult` with statistics

For detailed statistics, we need to:
- Track per-arbitrary metrics during exploration (in Explorer)
- Collect distribution data during sampling (in Sampler or Explorer)
- Aggregate statistics in FluentCheck
- Format output in FluentReporter

### Strategy Configuration

```typescript
// Enable detailed statistics
fc.scenario()
  .config(fc.strategy()
    .withDetailedStatistics()
    .withVerbosity(Verbosity.Verbose))
  .forall('x', fc.integer(1, 100))
  .forall('xs', fc.array(fc.integer(-10, 10)))
  .then(({x, xs}) => true)
  .check()
```

### Event Tracking

```typescript
// Track ad-hoc occurrences during test execution
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => {
    if (x > 1000) fc.event('large value')
    if (x < 0) fc.event('negative')
    if (x === 0) fc.event('zero')
    return someProperty(x)
  })
  .check()

// Events appear in statistics:
// result.statistics.events = { 'large value': 42, 'negative': 489, 'zero': 12 }
```

### Targeted Testing (Coverage-Guided Optimization)

```typescript
// Guide exploration toward interesting regions
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .then(({xs}) => {
    // Hypothesis will try to maximize this value
    fc.target(xs.length, 'array length')
    fc.target(Math.max(...xs, 0), 'max element')
    return isSorted(sort(xs))
  })
  .check()

// Target scores appear in statistics:
// result.statistics.targets = { 'array length': { best: 47, observations: 1000 }, ... }
```

### Arbitrary Statistics

```typescript
result.statistics.arbitraryStats
// {
//   x: {
//     samplesGenerated: 1000,
//     uniqueValues: 97,
//     cornerCases: { tested: [{ value: 1 }, { value: 100 }], total: 2 },
//     distribution: { min: 1, max: 100, mean: 50.3, median: 51, ... }
//   },
//   xs: {
//     samplesGenerated: 1000,
//     uniqueValues: 1000,
//     arrayLengths: { min: 0, max: 20, mean: 9.7 }
//   }
// }
```

### Verbosity Levels

```typescript
enum Verbosity {
  Quiet = 0,   // No output
  Normal = 1,  // Default, counterexamples only
  Verbose = 2, // Progress and all test cases
  Debug = 3    // Internal debugging info
}
```

### Enhanced Reporting

```typescript
// Format statistics for output
FluentReporter.formatStatistics(result.statistics, {
  format: 'markdown',  // 'markdown' | 'json' | 'text'
  detailed: true,
  includeHistograms: true
})

// Check options for statistics output
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({ logStatistics: true, verbose: true })

// Progress callback for long-running tests
fc.scenario()
  .config(fc.strategy().withSampleSize(10000))
  .forall('x', fc.integer())
  .then(({x}) => true)
  .check({
    onProgress: (progress) => {
      console.log(`${progress.testsRun}/${progress.totalTests} (${progress.percentComplete}%)`)
    }
  })
```

## Impact

- **Affected specs**: `fluent-api`, `reporting`, `statistics`, `strategies`
- **Affected code**: `FluentStatistics`, `FluentReporter`, `FluentStrategyFactory`, `Explorer`, `Arbitrary`
- **Breaking changes**: None (additive only, opt-in features)
- **Performance**: Detailed statistics add 5-15% overhead compared to basic statistics mode. The overhead comes primarily from:
  - Unique value tracking via hash sets
  - Streaming quantile algorithm updates
  - Distribution metric calculations
  - **Note**: The 5-15% target is aspirational; up to 20% overhead is acceptable in practice.
    Tests allow up to 50% overhead for small test sizes where measurement variance is high.

## Dependencies

- Requires: `add-basic-statistics` (Phase 1) - ✅ Already implemented
- Requires: `add-test-classification` (Phase 2) - ✅ Already implemented
- Optional: `add-confidence-termination` (Phase 4) - Can be implemented independently; if present, enables confidence-based stopping with detailed statistics

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
- [Performance Analysis](../../../docs/research/statistical-ergonomics/performance-analysis.md)
