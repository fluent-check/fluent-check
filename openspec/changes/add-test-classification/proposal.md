# Change: Add Test Case Classification

> **GitHub Issue:** [#416](https://github.com/fluent-check/fluent-check/issues/416)

## Why

Property-based testing generates random inputs, but users have no visibility into what kinds of inputs were actually tested. Without classification, it's impossible to know if important categories (empty arrays, negative numbers, edge cases) were adequately covered.

This feature enables users to label and categorize test cases, providing insight into test distribution - inspired by QuickCheck's proven `label`, `classify`, and `collect` API.

## What Changes

- Add `classify(predicate, label)` method to FluentCheck
- Add `label(fn)` method for dynamic labeling
- Add `collect(fn)` method for value aggregation
- Extend `FluentStatistics` with `labels` and `labelPercentages` fields

### New Methods

```typescript
// Classify by predicate
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 5, 'small')
  .classify(({xs}) => xs.length >= 5, 'large')
  .then(({xs}) => xs.sort().length === xs.length)
  .check()

// Dynamic labeling
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
  .then(({x}) => Math.abs(x) >= 0)
  .check()

// Value collection
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .collect(({xs}) => xs.length)
  .then(({xs}) => true)
  .check()
```

### Statistics Output

```typescript
result.statistics.labels
// { empty: 152, small: 423, large: 425 }

result.statistics.labelPercentages
// { empty: 15.2, small: 42.3, large: 42.5 }
```

## Impact

- **Affected specs**: `fluent-api`
- **Affected code**: `FluentCheck`, `FluentStatistics`, `FluentStrategy`
- **Breaking changes**: None (additive only)
- **Performance**: 1-5% overhead depending on number of classifications

## Dependencies

- Requires: `add-basic-statistics` (Phase 1) for FluentStatistics foundation

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
- [Framework Comparison](../../../docs/research/statistical-ergonomics/framework-comparison.md)
