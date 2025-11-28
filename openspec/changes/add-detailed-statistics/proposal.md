# Change: Add Detailed Statistics and Enhanced Reporting

> **GitHub Issue:** [#419](https://github.com/fluent-check/fluent-check/issues/419)

## Why

For advanced analysis and debugging, users need detailed per-arbitrary statistics, distribution tracking, and configurable verbosity. This is opt-in functionality for power users who need deep visibility into test execution.

This feature completes the statistical ergonomics implementation with advanced capabilities like arbitrary statistics, streaming quantile estimation, and enhanced reporting.

## What Changes

- Add `withDetailedStatistics()` strategy option
- Add `ArbitraryStatistics` interface for per-arbitrary metrics
- Add `Verbosity` enum and `withVerbosity()` configuration
- Implement streaming quantile algorithm for distribution tracking
- Enhance `FluentReporter` with statistical formatting

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
  format: 'markdown',
  detailed: true
})

// Check options for statistics output
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check({ logStatistics: true, verbose: true })
```

## Impact

- **Affected specs**: `fluent-api`, `reporting`, `strategies`
- **Affected code**: `FluentStatistics`, `FluentReporter`, `FluentStrategyFactory`, `Arbitrary`
- **Breaking changes**: None (additive only, opt-in features)
- **Performance**: 5-15% overhead when enabled

## Dependencies

- Requires: `add-basic-statistics` (Phase 1)
- Requires: `add-test-classification` (Phase 2)
- Requires: `add-confidence-termination` (Phase 4)

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
- [Performance Analysis](../../../docs/research/statistical-ergonomics/performance-analysis.md)
