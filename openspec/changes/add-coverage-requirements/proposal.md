# Change: Add Coverage Requirements

> **GitHub Issue:** [#417](https://github.com/fluent-check/fluent-check/issues/417)

## Why

Classification shows what was tested, but doesn't enforce that important categories are adequately covered. Users need a way to specify minimum coverage requirements and have them verified statistically.

This feature enables users to specify coverage requirements like "at least 10% of tests should cover negative numbers" and verify them with statistical confidence - inspired by QuickCheck's `cover` and `checkCoverage` API.

## What Changes

- Add `cover(percentage, predicate, label)` method to FluentCheck
- Add `coverTable(name, categories, getCategory)` method for tabular coverage
- Add `checkCoverage(options)` terminal with statistical verification
- Add `CoverageResult` interface to FluentStatistics
- Implement Wilson score confidence interval for coverage verification

### New Methods

```typescript
// Basic coverage requirements
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .cover(1, ({x}) => x === 0, 'zero')
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()  // Fails if requirements not met

// Coverage table
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .coverTable('sizes', { empty: 5, small: 20, large: 20 },
    ({xs}) => xs.length === 0 ? 'empty' : xs.length < 10 ? 'small' : 'large')
  .then(({xs}) => xs.sort().length === xs.length)
  .checkCoverage({ confidence: 0.99 })
```

### Statistics Output

```typescript
result.statistics.coverageResults
// [
//   { label: 'negative', requiredPercentage: 10, observedPercentage: 49.8, satisfied: true, ... },
//   { label: 'positive', requiredPercentage: 10, observedPercentage: 49.7, satisfied: true, ... },
//   { label: 'zero', requiredPercentage: 1, observedPercentage: 0.5, satisfied: false, ... }
// ]
```

## Impact

- **Affected specs**: `fluent-api`, `statistics`
- **Affected code**: `FluentCheck`, `FluentStatistics`, `statistics.ts`
- **Breaking changes**: None (additive only)
- **Performance**: 2-10% overhead depending on requirements

## Dependencies

- Requires: `add-basic-statistics` (Phase 1)
- Requires: `add-test-classification` (Phase 2)

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
- [Statistical Foundations](../../../docs/research/statistical-ergonomics/statistical-foundations.md)
