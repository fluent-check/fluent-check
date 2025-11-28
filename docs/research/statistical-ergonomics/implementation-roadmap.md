# Implementation Roadmap: Statistical Ergonomics

This document provides a phased implementation plan for adding statistical features to FluentCheck, including dependencies, milestones, and migration guidance.

## Overview

The implementation is divided into 5 phases, each building on the previous:

```
Phase 1: Foundation        → Phase 2: Classification    → Phase 3: Coverage
    ↓                           ↓                            ↓
FluentStatistics           classify/label/collect       cover/checkCoverage
statistics in result       labels in statistics         coverage verification
                                                              ↓
                          Phase 5: Advanced ← Phase 4: Confidence
                               ↓                    ↓
                          detailed stats        withConfidence
                          adaptive sampling     checkWithConfidence
```

## Phase 1: Foundation (MVP)

**Goal**: Add basic statistics collection without breaking changes.

### Deliverables

1. **FluentStatistics interface** (basic fields only)
2. **Statistics field in FluentResult**
3. **Strategy statistics configuration**
4. **Basic timing and counting**

### Implementation Tasks

```
[ ] 1.1 Define FluentStatistics interface (src/statistics.ts)
    - testsRun: number
    - testsPassed: number
    - testsDiscarded: number
    - executionTimeMs: number

[ ] 1.2 Extend FluentResult class
    - Add statistics: FluentStatistics field
    - Initialize with empty statistics

[ ] 1.3 Add statistics collection to FluentStrategy
    - Start timer on first test
    - Increment counters during execution
    - Stop timer on completion

[ ] 1.4 Update check() method to populate statistics
    - Create statistics object at end
    - Include in returned FluentResult

[ ] 1.5 Add withStatistics() to FluentStrategyFactory
    - withStatistics(enabled?: boolean): this
    - Default: true

[ ] 1.6 Write unit tests for basic statistics
    - Test counter accuracy
    - Test timing measurement
    - Test with/without statistics

[ ] 1.7 Update documentation
    - Add statistics to API docs
    - Update README examples
```

### Files Modified

| File | Changes |
|------|---------|
| `src/statistics.ts` | Add FluentStatistics interface |
| `src/FluentCheck.ts` | Add statistics to FluentResult, collection logic |
| `src/strategies/FluentStrategy.ts` | Add statistics tracking |
| `src/strategies/FluentStrategyFactory.ts` | Add withStatistics() |
| `test/statistics.test.ts` | Add new tests |

### Acceptance Criteria

- [ ] `result.statistics.testsRun` accurately reflects test count
- [ ] `result.statistics.executionTimeMs` is within 10% of actual time
- [ ] Existing tests continue to pass
- [ ] Performance overhead < 1%

### Timeline

**Estimated**: 1-2 days

---

## Phase 2: Classification

**Goal**: Enable test case labeling and classification.

### Deliverables

1. **classify() method** on FluentCheck
2. **label() method** for dynamic labeling
3. **collect() method** for value aggregation
4. **Labels in FluentStatistics**

### Implementation Tasks

```
[ ] 2.1 Add labels field to FluentStatistics
    - labels?: Record<string, number>
    - labelPercentages?: Record<string, number>

[ ] 2.2 Create FluentCheckClassify class
    - Extends FluentCheck
    - Stores classification predicate and label
    - Chains with and()

[ ] 2.3 Add classify() method to FluentCheck
    - classify(predicate, label): FluentCheckClassify
    - Type-safe with Rec type parameter

[ ] 2.4 Add label() method
    - label(fn): FluentCheckClassify
    - fn returns string label

[ ] 2.5 Add collect() method
    - collect(fn): FluentCheckClassify
    - fn returns value, converted to string

[ ] 2.6 Add label tracking to strategy execution
    - Evaluate predicates after each test
    - Increment label counters
    - Calculate percentages at end

[ ] 2.7 Write unit tests for classification
    - Test single classify
    - Test chained classifications
    - Test label distribution accuracy
    - Test with overlapping labels

[ ] 2.8 Update documentation with examples
```

### Files Modified

| File | Changes |
|------|---------|
| `src/FluentCheck.ts` | Add classify(), label(), collect() methods |
| `src/FluentCheckClassify.ts` | New file for classification chain |
| `src/statistics.ts` | Add labels to FluentStatistics |
| `src/strategies/FluentStrategy.ts` | Add label tracking |
| `test/classification.test.ts` | New test file |

### Acceptance Criteria

- [ ] Classification predicates are evaluated correctly
- [ ] Labels accumulate across multiple tests
- [ ] Percentages are calculated correctly
- [ ] Type inference works through classify chain
- [ ] Performance overhead < 5% for 3 classifications

### Timeline

**Estimated**: 2-3 days

---

## Phase 3: Coverage

**Goal**: Enable coverage requirements and verification.

### Deliverables

1. **cover() method** for coverage requirements
2. **coverTable() method** for tabular coverage
3. **checkCoverage() terminal** with statistical verification
4. **CoverageResult in statistics**

### Implementation Tasks

```
[ ] 3.1 Add CoverageResult interface
    - label, requiredPercentage, observedPercentage
    - satisfied, count, confidenceInterval

[ ] 3.2 Add coverageResults to FluentStatistics
    - coverageResults?: CoverageResult[]

[ ] 3.3 Create FluentCheckCoverage class
    - Extends FluentCheckClassify
    - Stores coverage requirements
    - Chains with andCover()

[ ] 3.4 Add cover() method to FluentCheck
    - cover(percentage, predicate, label): FluentCheckCoverage
    - Validates percentage is 0-100

[ ] 3.5 Add coverTable() method
    - coverTable(name, categories, getCategory): FluentCheckCoverage
    - Creates multiple coverage requirements

[ ] 3.6 Implement Wilson score confidence interval
    - wilsonScoreInterval(successes, total, confidence)
    - Used for coverage verification

[ ] 3.7 Implement checkCoverage() terminal
    - Run tests until all requirements met with confidence
    - Or until max tests reached
    - Return result with coverage details

[ ] 3.8 Add CheckCoverageOptions interface
    - confidence, maxTests, continueOnFailure

[ ] 3.9 Write unit tests for coverage
    - Test single coverage requirement
    - Test multiple requirements
    - Test coverage table
    - Test statistical verification

[ ] 3.10 Update documentation
```

### Files Modified

| File | Changes |
|------|---------|
| `src/FluentCheck.ts` | Add cover(), coverTable(), checkCoverage() |
| `src/FluentCheckCoverage.ts` | New file for coverage chain |
| `src/statistics.ts` | Add CoverageResult, coverage calculation |
| `test/coverage.test.ts` | New test file |

### Acceptance Criteria

- [ ] Coverage requirements are tracked correctly
- [ ] Wilson score interval is calculated correctly
- [ ] checkCoverage() continues until requirements met
- [ ] Failure message includes which requirements failed
- [ ] Performance overhead < 10% for 3 requirements

### Timeline

**Estimated**: 3-4 days

---

## Phase 4: Confidence

**Goal**: Enable confidence-based termination and reporting.

### Deliverables

1. **withConfidence() strategy option**
2. **checkWithConfidence() terminal**
3. **Confidence metrics in statistics**
4. **Credible interval calculation**

### Implementation Tasks

```
[ ] 4.1 Add confidence fields to FluentStatistics
    - confidence?: number
    - credibleInterval?: [number, number]

[ ] 4.2 Implement Bayesian confidence calculation
    - calculateConfidence(n, k, epsilon)
    - Using Beta distribution from jstat

[ ] 4.3 Implement credible interval calculation
    - equalTailedCredibleInterval(n, k, width)
    - Using Beta quantile functions

[ ] 4.4 Add withConfidence() to FluentStrategyFactory
    - withConfidence(level): this
    - Stores target confidence level

[ ] 4.5 Add withMinConfidence() to FluentStrategyFactory
    - withMinConfidence(level): this
    - Continue past sample size if confidence too low

[ ] 4.6 Implement checkWithConfidence() terminal
    - checkWithConfidence(level, options): FluentResult
    - Run until confidence achieved or max tests

[ ] 4.7 Modify strategy execution for confidence-based stopping
    - Check confidence after batches of tests
    - Stop when target reached

[ ] 4.8 Add ConfidenceOptions interface
    - maxTests, credibleIntervalWidth

[ ] 4.9 Write unit tests for confidence
    - Test confidence calculation
    - Test credible intervals
    - Test stopping behavior
    - Test edge cases (0 failures, all failures)

[ ] 4.10 Update documentation
```

### Files Modified

| File | Changes |
|------|---------|
| `src/statistics.ts` | Add confidence calculations |
| `src/FluentCheck.ts` | Add checkWithConfidence() |
| `src/strategies/FluentStrategy.ts` | Add confidence-based stopping |
| `src/strategies/FluentStrategyFactory.ts` | Add withConfidence(), withMinConfidence() |
| `test/confidence.test.ts` | New test file |

### Acceptance Criteria

- [ ] Confidence calculation matches expected values
- [ ] Credible intervals are statistically correct
- [ ] Testing stops when confidence achieved
- [ ] Results include accurate confidence metrics
- [ ] Performance overhead < 5%

### Timeline

**Estimated**: 3-4 days

---

## Phase 5: Advanced Features (Opt-in)

**Goal**: Add detailed statistics for power users.

### Deliverables

1. **withDetailedStatistics() strategy option**
2. **ArbitraryStatistics** per arbitrary
3. **Distribution tracking**
4. **Verbosity levels**
5. **Enhanced reporting**

### Implementation Tasks

```
[ ] 5.1 Add ArbitraryStatistics interface
    - samplesGenerated, uniqueValues
    - cornerCases, distribution

[ ] 5.2 Add arbitraryStats to FluentStatistics
    - arbitraryStats?: Record<string, ArbitraryStatistics>

[ ] 5.3 Add withDetailedStatistics() to strategy
    - Enables per-arbitrary tracking
    - Higher overhead, opt-in only

[ ] 5.4 Implement streaming quantile algorithm
    - P² algorithm or t-digest
    - O(1) memory, O(1) update

[ ] 5.5 Implement corner case tracking
    - Track which corner cases tested
    - Report in statistics

[ ] 5.6 Add Verbosity enum
    - Quiet, Normal, Verbose, Debug

[ ] 5.7 Add withVerbosity() to strategy
    - Controls output during execution

[ ] 5.8 Enhance FluentReporter
    - formatStatistics(stats, options)
    - Verbose and concise modes
    - Table formatting for labels/coverage

[ ] 5.9 Add check options for statistics output
    - verbose, logStatistics, showLabels, showCoverage

[ ] 5.10 Write unit tests for advanced features
    - Test detailed stats collection
    - Test distribution accuracy
    - Test verbosity levels

[ ] 5.11 Update documentation
```

### Files Modified

| File | Changes |
|------|---------|
| `src/statistics.ts` | Add ArbitraryStatistics, streaming algorithms |
| `src/FluentReporter.ts` | Add statistical output formatting |
| `src/strategies/FluentStrategyFactory.ts` | Add withDetailedStatistics(), withVerbosity() |
| `src/arbitraries/Arbitrary.ts` | Add corner case metadata |
| `test/detailed-stats.test.ts` | New test file |

### Acceptance Criteria

- [ ] Detailed stats are accurate
- [ ] Streaming quantiles within 5% of true values
- [ ] Verbosity levels control output correctly
- [ ] Reporter formats statistics clearly
- [ ] Performance overhead < 15% when enabled

### Timeline

**Estimated**: 4-5 days

---

## Backwards Compatibility

### Guaranteed Compatibility

1. **Existing code works unchanged**
   ```typescript
   // This still works exactly as before
   const result = fc.scenario()
     .forall('x', fc.integer())
     .then(({x}) => x >= 0)
     .check()
   
   // result.satisfiable, result.example, result.seed all unchanged
   ```

2. **New field is additive**
   ```typescript
   // result.statistics is new but doesn't break anything
   // Old code that doesn't use it continues to work
   ```

3. **Default behavior is non-breaking**
   - Basic stats collected by default (minimal overhead)
   - No console output unless requested
   - Same test execution semantics

### Migration Guide

#### From Pre-Statistics Version

**No changes required.** Existing code continues to work.

**Optional enhancements:**

```typescript
// Before: No statistics
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

// After: Access statistics
console.log(`Ran ${result.statistics.testsRun} tests`)
console.log(`Time: ${result.statistics.executionTimeMs}ms`)
```

#### Adding Classification

```typescript
// Before: No visibility into test distribution
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .then(({xs}) => xs.sort().length === xs.length)
  .check()

// After: Understand test distribution
const result = fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 10, 'small')
  .classify(({xs}) => xs.length >= 10, 'large')
  .then(({xs}) => xs.sort().length === xs.length)
  .check()

console.log('Distribution:', result.statistics.labels)
```

#### Adding Coverage Requirements

```typescript
// Before: Hope for good coverage
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .then(({x}) => Math.abs(x) >= 0)
  .check()

// After: Verify coverage
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .cover(1, ({x}) => x === 0, 'zero')
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()
```

#### Adding Confidence-Based Testing

```typescript
// Before: Fixed sample size
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// After: Run until confident
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.99)

console.log(`Achieved ${result.statistics.confidence}% confidence`)
```

---

## Minimal Viable Product (MVP)

**Phase 1 alone** provides immediate value:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

// Now available:
result.statistics.testsRun        // e.g., 1000
result.statistics.testsPassed     // e.g., 1000
result.statistics.testsDiscarded  // e.g., 0
result.statistics.executionTimeMs // e.g., 45
```

**Minimum features for MVP:**
- testsRun, testsPassed, testsDiscarded
- executionTimeMs
- Negligible performance overhead

---

## Advanced Features Summary

Features for **later phases** (not MVP):

| Feature | Phase | Rationale |
|---------|-------|-----------|
| Labels/classification | 2 | Requires new API methods |
| Coverage requirements | 3 | Requires statistical verification |
| Confidence-based stopping | 4 | Complex implementation |
| Detailed arbitrary stats | 5 | Performance overhead |
| Adaptive sampling | 5+ | Research required |
| Health checks | 5+ | Complex heuristics |

---

## Total Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 1-2 days | 1-2 days |
| Phase 2: Classification | 2-3 days | 3-5 days |
| Phase 3: Coverage | 3-4 days | 6-9 days |
| Phase 4: Confidence | 3-4 days | 9-13 days |
| Phase 5: Advanced | 4-5 days | 13-18 days |

**Total estimated**: 2-4 weeks

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance regression | Continuous benchmarking in CI |
| API design issues | Prototype in separate branch, gather feedback |
| Type inference problems | Extensive type tests before merge |
| Breaking changes | Feature flags for all new features |
| jstat dependency issues | Consider pure TS implementation |

---

## Success Metrics

1. **Functionality**: All acceptance criteria met
2. **Performance**: Overhead within specified limits
3. **Compatibility**: All existing tests pass
4. **Adoption**: Users report improved test visibility
5. **Quality**: No regressions, comprehensive test coverage
