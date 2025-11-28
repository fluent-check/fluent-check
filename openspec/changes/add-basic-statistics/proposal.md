# Change: Add Basic Statistics to FluentResult

> **GitHub Issue:** [#415](https://github.com/fluent-check/fluent-check/issues/415)

## Why

FluentCheck currently returns minimal information about test execution - only `satisfiable`, `example`, and `seed`. Users have no visibility into:

- How many tests were actually executed
- How long the tests took to run
- How many test cases were discarded due to preconditions/filters

This is the foundational MVP for the statistical ergonomics research, providing immediate value with negligible overhead.

## What Changes

- Add `FluentStatistics` interface with basic metrics
- Extend `FluentResult` with `statistics` field
- Add statistics collection to test execution
- Add `withStatistics()` strategy configuration option

### New FluentStatistics Interface

```typescript
interface FluentStatistics {
  testsRun: number         // Total test cases executed
  testsPassed: number      // Test cases that passed
  testsDiscarded: number   // Test cases filtered by preconditions
  executionTimeMs: number  // Total execution time in milliseconds
}
```

### Enhanced FluentResult

```typescript
interface FluentResult<Rec> {
  satisfiable: boolean
  example: Rec
  seed?: number
  statistics: FluentStatistics  // NEW
}
```

### Usage Example

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

console.log(result.statistics.testsRun)        // 1000
console.log(result.statistics.executionTimeMs) // 45
```

## Impact

- **Affected specs**: `fluent-api`, `reporting`
- **Affected code**: `FluentResult`, `FluentCheck`, `FluentStrategy`, `FluentStrategyFactory`
- **Breaking changes**: None (additive only)
- **Performance**: < 1% overhead

## Dependencies

None - this is the foundation for subsequent statistical features.

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings:
- [API Design](../../../docs/research/statistical-ergonomics/api-design.md)
- [Performance Analysis](../../../docs/research/statistical-ergonomics/performance-analysis.md)
- [Implementation Roadmap](../../../docs/research/statistical-ergonomics/implementation-roadmap.md)
