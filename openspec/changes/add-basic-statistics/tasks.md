# Tasks: Add Basic Statistics

## 1. Core Implementation

- [ ] 1.1 Define FluentStatistics interface in `src/statistics.ts`
- [ ] 1.2 Extend FluentResult class with statistics field
- [ ] 1.3 Initialize FluentResult with empty/default statistics
- [ ] 1.4 Add statistics tracking to FluentStrategy
- [ ] 1.5 Start timer on first test execution
- [ ] 1.6 Increment counters during test execution
- [ ] 1.7 Stop timer and finalize statistics on completion

## 2. Strategy Configuration

- [ ] 2.1 Add withStatistics(enabled?: boolean) to FluentStrategyFactory
- [ ] 2.2 Default withStatistics to true
- [ ] 2.3 Respect statistics flag in execution

## 3. Testing

- [ ] 3.1 Test testsRun counter accuracy
- [ ] 3.2 Test testsPassed counter accuracy
- [ ] 3.3 Test testsDiscarded counter accuracy
- [ ] 3.4 Test executionTimeMs is within 10% of actual time
- [ ] 3.5 Test statistics with withStatistics(false)
- [ ] 3.6 Verify existing tests continue to pass

## 4. Documentation

- [ ] 4.1 Update API documentation with statistics field
- [ ] 4.2 Add statistics examples to README
- [ ] 4.3 Update CHANGELOG

## Acceptance Criteria

- [ ] `result.statistics.testsRun` accurately reflects test count
- [ ] `result.statistics.executionTimeMs` is within 10% of actual time
- [ ] Existing tests continue to pass
- [ ] Performance overhead < 1%
