# Change: Add Confidence-Based Termination

> **GitHub Issue:** [#418](https://github.com/fluent-check/fluent-check/issues/418)

## Why

Currently, FluentCheck runs a fixed number of tests regardless of whether sufficient confidence has been achieved. For critical systems, users need to specify "run until 99.9% confident" rather than an arbitrary sample size.

This feature enables Bayesian confidence-based termination, leveraging FluentCheck's existing statistical foundations (Beta distribution) to calculate posterior probability that a property holds.

## What Changes

- Add `withConfidence(level)` to FluentStrategyFactory
- Add `withMinConfidence(level)` for minimum confidence threshold
- Add `checkWithConfidence(level, options)` terminal method
- Add `confidence` and `credibleInterval` to FluentStatistics
- Implement Bayesian confidence calculation using Beta distribution

### New Strategy Configuration

```typescript
// Run until 99% confident
fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.99)
    .withMaxIterations(50000))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// Minimum confidence - continue past sample size if confidence too low
fc.scenario()
  .config(fc.strategy()
    .withMinConfidence(0.95)
    .withSampleSize(1000))
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()
```

### New Terminal Method

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)

console.log(result.statistics.confidence)       // 0.9992
console.log(result.statistics.testsRun)         // 6905 (variable)
console.log(result.statistics.credibleInterval) // [0.9995, 1.0]
```

## Impact

- **Affected specs**: `fluent-api`, `statistics`, `strategies`
- **Affected code**: `FluentCheck`, `FluentStatistics`, `FluentStrategy`, `FluentStrategyFactory`
- **Breaking changes**: None (additive only)
- **Performance**: < 5% overhead

## Dependencies

- Requires: `add-basic-statistics` (Phase 1)

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [Statistical Foundations](../../../docs/research/statistical-ergonomics/statistical-foundations.md)
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
