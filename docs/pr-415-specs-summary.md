# PR #415 Specs Summary: Add Basic Statistics

This document extracts the fundamental specifications from PR #415 (add-basic-statistics) and updates them for the current codebase architecture.

## Original Proposal Summary

PR #415 was Phase 1 of the statistical ergonomics research, proposing to add basic execution statistics to `FluentResult`. The proposal included:

1. **FluentStatistics Interface** - Basic metrics for test execution
2. **Enhanced FluentResult** - Add `statistics` field
3. **Statistics Collection** - Track during test execution
4. **Strategy Configuration** - Optional `withStatistics()` method

## Current Codebase State

### What Already Exists

1. **ExplorationResult** (`src/strategies/Explorer.ts`) already tracks:
   - `testsRun: number` - Total test cases executed
   - `skipped: number` - Test cases filtered by preconditions
   - `startTime: number` (in `ExplorationState`) - Execution start time

2. **FluentResult** (`src/FluentCheck.ts`) currently has:
   - `satisfiable: boolean`
   - `example: Rec`
   - `seed?: number`
   - `skipped: number` (already present!)

3. **Execution Flow**:
   - `FluentCheck.check()` receives `ExplorationResult` with `testsRun` and `skipped`
   - Results are constructed in `FluentCheck.check()` at lines 412-417, 421-426, 432-437, and 450-459

### What's Missing

1. **FluentStatistics Interface** - Not yet defined
2. **statistics field in FluentResult** - Not present
3. **Execution time tracking** - `startTime` exists but not used to calculate duration
4. **testsPassed calculation** - Need to derive from `testsRun` and `skipped`
5. **testsDiscarded** - This is the same as `skipped` (already tracked)

## Updated Specifications

### 1. FluentStatistics Interface

**Location**: Should be added to `src/statistics.ts` (currently only has probability distributions)

```typescript
export interface FluentStatistics {
  testsRun: number         // Total test cases executed
  testsPassed: number      // Test cases that passed (testsRun - skipped for passed tests)
  testsDiscarded: number   // Test cases filtered by preconditions (same as skipped)
  executionTimeMs: number  // Total execution time in milliseconds
}
```

**Note**: `testsDiscarded` is equivalent to the existing `skipped` field. For consistency with the original spec, we keep both names but they represent the same metric.

### 2. Enhanced FluentResult

**Current signature** (line 83-88 in `src/FluentCheck.ts`):
```typescript
export class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly seed?: number,
    public skipped = 0) { }
}
```

**Proposed addition**:
```typescript
export class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly seed?: number,
    public skipped = 0,
    public readonly statistics?: FluentStatistics  // NEW - optional for backward compatibility
  ) { }
}
```

### 3. Statistics Collection Points

**In `FluentCheck.check()`** (lines 344-459):

The `explorationResult` already contains:
- `testsRun` (from `ExplorationResult`)
- `skipped` (from `ExplorationResult`)

**Missing data to collect**:
- `executionTimeMs`: Calculate from `ExplorationState.startTime` to completion
- `testsPassed`: Calculate as:
  - If `satisfiable === true`: `testsRun - skipped`
  - If `satisfiable === false`: `testsRun - skipped - 1` (tests passed before counterexample)

**Implementation approach**:
1. Capture start time before exploration begins (line ~377)
2. Capture end time after exploration completes
3. Calculate `executionTimeMs = endTime - startTime`
4. Calculate `testsPassed` based on `satisfiable` and `explorationResult`
5. Create `FluentStatistics` object
6. Pass to `FluentResult` constructor

### 4. Strategy Configuration (Optional)

**Original spec**: `.config(fc.strategy().withStatistics(false))`

**Current state**: `FluentStrategyFactory` doesn't have `withStatistics()` method

**Decision needed**: 
- Option A: Add `withStatistics(enabled?: boolean)` to `FluentStrategyFactory`
- Option B: Always collect statistics (simpler, minimal overhead)
- Option C: Make statistics optional via `FluentResult` constructor (already optional with `?`)

**Recommendation**: Start with Option B (always collect), add Option A later if needed for performance-sensitive scenarios.

## Updated Requirements (from Original Specs)

### Requirement: Basic Statistics in FluentResult

The system SHALL include basic execution statistics in every FluentResult.

#### Scenario: Statistics available after check
- **WHEN** `.check()` completes
- **THEN** `result.statistics` SHALL be populated with execution metrics
- **AND** existing fields (`satisfiable`, `example`, `seed`, `skipped`) SHALL remain unchanged

#### Scenario: Test count statistics
- **WHEN** tests are executed
- **THEN** `result.statistics.testsRun` SHALL equal the total number of test cases executed
- **AND** `result.statistics.testsPassed` SHALL equal tests where the property held
  - For satisfiable results: `testsPassed = testsRun - skipped`
  - For unsatisfiable results: `testsPassed = 0`
- **AND** `result.statistics.testsDiscarded` SHALL equal tests filtered by preconditions (same as `skipped`)

#### Scenario: Execution time tracking
- **WHEN** tests complete
- **THEN** `result.statistics.executionTimeMs` SHALL contain the total execution time in milliseconds
- **AND** the measured time SHALL be within 10% of actual wall-clock time

### Requirement: Statistics Interface

The system SHALL provide a FluentStatistics interface for test execution metrics.

#### Scenario: Basic statistics fields
- **WHEN** a test completes
- **THEN** `statistics.testsRun` SHALL be a number representing total tests executed
- **AND** `statistics.testsPassed` SHALL be a number representing tests that passed
- **AND** `statistics.testsDiscarded` SHALL be a number representing filtered tests
- **AND** `statistics.executionTimeMs` SHALL be a number representing execution time

## Implementation Notes

### Key Differences from Original Spec

1. **Architecture**: The codebase now uses `Explorer` pattern with `ExplorationResult`, which already tracks `testsRun` and `skipped`. This simplifies implementation.

2. **Timing**: `ExplorationState` already has `startTime`, but we need to:
   - Ensure end time is captured
   - Calculate duration in `FluentCheck.check()`

3. **Backward Compatibility**: Making `statistics` optional (`statistics?: FluentStatistics`) ensures existing code continues to work.

4. **Data Sources**:
   - `testsRun`: From `explorationResult.testsRun`
   - `skipped`: From `explorationResult.skipped` (or `FluentResult.skipped`)
   - `testsPassed`: Calculated from `testsRun`, `skipped`, and `satisfiable`
   - `executionTimeMs`: Calculated from start/end times

### Files to Modify

1. **src/statistics.ts**: Add `FluentStatistics` interface
2. **src/FluentCheck.ts**: 
   - Import `FluentStatistics`
   - Add `statistics` parameter to `FluentResult` constructor
   - Calculate statistics in `check()` method
   - Pass statistics to `FluentResult` constructors (4 locations: lines 412, 421, 432, 450)
3. **src/strategies/Explorer.ts**: 
   - Ensure `startTime` is set in `ExplorationState`
   - Consider exposing end time or duration (or calculate in `FluentCheck`)

### Testing Considerations

- Test that `statistics.testsRun` matches actual test execution
- Test that `statistics.testsPassed` is correct for both satisfiable and unsatisfiable results
- Test that `statistics.testsDiscarded` equals `skipped`
- Test that `statistics.executionTimeMs` is reasonable (within 10% of actual time)
- Verify backward compatibility (existing code without statistics access still works)

## Next Steps

1. Review this summary and confirm alignment with current architecture
2. Decide on strategy configuration approach (Option A, B, or C)
3. Create updated OpenSpec proposal if proceeding with implementation
4. Implement following the updated specifications above
