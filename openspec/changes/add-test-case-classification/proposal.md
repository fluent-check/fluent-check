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
- Add classification node types to Scenario AST

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

- **Affected specs**: `fluent-api`, `reporting`, `statistics`
- **Affected code**: `FluentCheck`, `FluentStatistics`, `Scenario`, `Explorer`
- **Breaking changes**: None (additive only)
- **Performance**: 1-5% overhead depending on number of classifications

## Implementation Approach

### Scenario AST Extensions

Add new node types to `Scenario.ts`:
- `ClassifyNode<Rec>` - predicate-based classification with label
- `LabelNode<Rec>` - dynamic label function
- `CollectNode<Rec>` - value collection function

### Statistics Collection

Extend `FluentStatistics` interface in `src/statistics.ts`:
```typescript
export interface FluentStatistics {
  // ... existing fields ...
  /** Label counts for test case classifications */
  labels?: Record<string, number>
  /** Label percentages (0-100) for test case classifications */
  labelPercentages?: Record<string, number>
}
```

### Execution Integration

Classification data is collected during test execution in `Explorer.explore()`:
- Extract classification nodes from scenario (similar to how `then` nodes are extracted)
- Evaluate classification predicates/labels for each test case in the property evaluator
- Track label counts in `ExplorationState` (extend with `labels: Map<string, number>` field)
- Return label counts in `ExplorationResult` (extend result types with optional `labels` field)
- Aggregate into `FluentStatistics` in `FluentCheck.check()`

### Data Flow

1. User calls `.classify()`, `.label()`, or `.collect()` - adds node to Scenario AST
2. `FluentCheck.check()` builds scenario with classification nodes
3. `Explorer.explore()` extracts classification nodes from scenario
4. For each test case, `Explorer` evaluates all classification predicates/functions
5. Label counts accumulated in `ExplorationState.labels` Map
6. `ExplorationResult` includes label counts (extend result types)
7. `FluentCheck.check()` calculates percentages from label counts and `testsRun`
8. `FluentStatistics` includes `labels` and `labelPercentages` fields

## Dependencies

- **Requires**: `add-basic-statistics` (Phase 1) - ✅ **COMPLETED**
  - `FluentStatistics` interface exists and is required in `FluentResult`
  - Statistics collection infrastructure is in place
  - Can extend existing statistics with classification data

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/fluent-api-ergonomics/api-catalog.md) - Classification patterns
- [Framework Comparison](../../../docs/research/fluent-api-ergonomics/framework-comparison.md) - QuickCheck inspiration
