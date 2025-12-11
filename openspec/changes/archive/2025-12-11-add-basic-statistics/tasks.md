# Tasks: Add Basic Statistics

## 1. Core Implementation

- [x] 1.1 Define FluentStatistics interface in `src/statistics.ts`
- [x] 1.2 Update FluentResult constructor to require statistics parameter
- [x] 1.3 Add timing tracking (start/end) in FluentCheck.check() method
- [x] 1.4 Create calculateStatistics helper function in check() method
- [x] 1.5 Update all 4 FluentResult constructor calls to include statistics

## 2. Testing

- [x] 2.1 Test testsRun counter accuracy
- [x] 2.2 Test testsPassed counter accuracy (satisfiable vs unsatisfiable)
- [x] 2.3 Test testsDiscarded equals skipped
- [x] 2.4 Test executionTimeMs is positive and reasonable
- [x] 2.5 Update existing tests that create FluentResult directly
- [x] 2.6 Verify all existing tests continue to pass

## 3. Documentation

- [x] 3.1 Update API documentation with statistics field
- [x] 3.2 Add statistics examples to README (if applicable)
- [x] 3.3 Update CHANGELOG

## Acceptance Criteria

- [x] `result.statistics.testsRun` accurately reflects test count from ExplorationResult
- [x] `result.statistics.testsPassed` is correct for both satisfiable and unsatisfiable results
- [x] `result.statistics.testsDiscarded` equals `skipped`
- [x] `result.statistics.executionTimeMs` is positive and reasonable
- [x] All existing tests pass with updated FluentResult usage
- [x] Performance overhead < 1%
