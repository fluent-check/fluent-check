# Change: Add Basic Statistics to FluentResult

> **GitHub Issue:** [#415](https://github.com/fluent-check/fluent-check/issues/415)

## Why

FluentCheck currently returns minimal information about test execution - only `satisfiable`, `example`, `seed`, and `skipped`. Users have no visibility into:

- How many tests were actually executed
- How long the tests took to run
- How many test cases passed vs were discarded

This is the foundational MVP for the statistical ergonomics research, providing immediate value with negligible overhead.

## What Changes

- Add `FluentStatistics` interface with basic metrics
- Extend `FluentResult` with required `statistics` field
- Add statistics collection to test execution in `FluentCheck.check()`

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
class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly seed?: number,
    public skipped = 0,
    public readonly statistics: FluentStatistics  // NEW - required
  ) { }
}
```

### Usage Example

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

console.log(result.statistics.testsRun)        // 1000
console.log(result.statistics.testsPassed)      // 1000
console.log(result.statistics.executionTimeMs)  // 45
```

## Impact

- **Affected specs**: `fluent-api`, `reporting`
- **Affected code**: `FluentResult`, `FluentCheck`, `statistics.ts`
- **Breaking changes**: Yes - `statistics` is a required field (no backward compatibility)
- **Performance**: < 1% overhead

## Implementation Approach

Statistics are calculated from `ExplorationResult` data which already tracks `testsRun` and `skipped`. Execution time is measured in `FluentCheck.check()` wrapping the exploration phase.

- `testsRun`: From `explorationResult.testsRun`
- `skipped`: From `explorationResult.skipped` (same as `testsDiscarded`)
- `testsPassed`: Calculated as `satisfiable ? testsRun - skipped : 0`
- `executionTimeMs`: Calculated from start/end times in `check()`

## Dependencies

None - this is the foundation for subsequent statistical features (add-test-classification, add-coverage-requirements, add-confidence-termination, add-detailed-statistics).

## Research Reference

See `docs/research/statistical-ergonomics/` for full research findings (if available) and `docs/pr-415-specs-summary.md` for architecture analysis.
