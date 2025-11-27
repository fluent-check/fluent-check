# Design: Statistical Ergonomics Research

## Context

FluentCheck differentiates itself from other property-based testing libraries by having statistical foundations built-in (Beta and Beta-Binomial distributions, Bayesian size estimation). However, these capabilities are internal implementation details not exposed to users. This design document captures research findings and proposes how to expose statistical features ergonomically.

## Goals

1. **Confidence-Based Testing**: Allow users to specify desired confidence levels instead of arbitrary sample sizes
2. **Coverage Visibility**: Provide insight into what kinds of inputs were tested
3. **Coverage Requirements**: Allow users to enforce minimum coverage of important categories
4. **Statistical Reporting**: Surface rich statistics in test results
5. **Backwards Compatibility**: Existing code should continue to work without changes

## Non-Goals

1. Code coverage (line/branch coverage) - this is orthogonal to input space coverage
2. Mutation testing integration
3. Real-time visualization during test execution

## Research Findings

### Framework Comparison

| Feature | QuickCheck | Hypothesis | fast-check | FluentCheck (current) |
|---------|------------|------------|------------|----------------------|
| Label/classify | ✅ `label`, `classify`, `collect`, `tabulate` | ✅ `note` | ✅ `example` | ❌ |
| Coverage requirements | ✅ `cover`, `checkCoverage` | ❌ | ❌ | ❌ |
| Confidence-based stopping | ✅ via `checkCoverage` | ❌ | ❌ | ❌ |
| Statistics in result | ✅ detailed | ✅ phases | ✅ basic | ❌ seed only |
| Adaptive sampling | ❌ | ✅ database | ❌ | ❌ |

### QuickCheck's Statistical Model

QuickCheck uses a sequential testing approach for `checkCoverage`:
- Starts with a "burn-in" period of ~min_tests_total * 10 (e.g., 1000 tests)
- Uses a one-sided binomial test at each coverage requirement
- Continues testing until all requirements are met with statistical confidence OR a maximum is reached
- Uses Wilson score confidence interval for coverage estimation

### Bayesian Approach for Confidence

Given n tests with k failures, using a Beta(α, β) prior:
- **Prior**: Beta(1, 1) = Uniform (non-informative)
- **Posterior**: Beta(α + n - k, β + k)
- **Credible Interval**: Quantiles of the posterior distribution

For "confidence the property holds":
- P(all inputs satisfy property) ≈ CDF of posterior at 1.0
- More practically: P(success rate > 0.9999) as proxy

### Implementation Considerations

**Performance**: Statistics collection has overhead:
- Label counting: O(1) per test, minimal impact
- Distribution tracking: O(log n) with streaming quantile estimation
- Confidence calculation: O(1) using jstat Beta functions

Recommendation: Enable basic stats by default, detailed stats opt-in.

## Decisions

### Decision 1: Classification API Design

**Options Considered**:

A. **QuickCheck-style** (separate functions):
```typescript
.classify(x < 0, 'negative')
.label(`size-${xs.length}`)
.collect(xs.length)
.tabulate('types', typeCategories)
```

B. **Fluent chain style** (single method, multiple modes):
```typescript
.classify(({x}) => x < 0, 'negative')
.classify(({xs}) => `size-${xs.length}`)  // auto-collect
.classify(({xs}) => xs.length)             // auto-convert to string
```

C. **Builder pattern**:
```typescript
.withClassification(c => c
  .label(({x}) => x < 0 ? 'negative' : 'positive')
  .collect(({xs}) => xs.length))
```

**Decision**: Option B - Fluent chain style with overloaded `classify` method.

**Rationale**: 
- Consistent with existing fluent API
- Flexible enough for common use cases
- Type-safe with function overloads

### Decision 2: Coverage Requirement API

**Options Considered**:

A. **QuickCheck-style** (separate `cover` and `checkCoverage`):
```typescript
.cover(10, ({x}) => x < 0, 'negative')
.checkCoverage()
```

B. **Unified with check options**:
```typescript
.check({ 
  coverage: [
    { pct: 10, predicate: ({x}) => x < 0, label: 'negative' }
  ]
})
```

C. **Strategy configuration**:
```typescript
.config(fc.strategy()
  .withCoverage('negative', 10)
  .withCoverage('positive', 10))
```

**Decision**: Option A - QuickCheck-style with fluent methods.

**Rationale**:
- Proven ergonomics from QuickCheck
- Keeps classification near the data it operates on
- `checkCoverage()` is explicit about intent

### Decision 3: Confidence-Based Stopping

**Options Considered**:

A. **Strategy configuration only**:
```typescript
.config(fc.strategy().withConfidence(0.99))
.check()
```

B. **Check method variant**:
```typescript
.checkWithConfidence(0.99)
```

C. **Both options**:
```typescript
// Strategy-level default
.config(fc.strategy().withMinConfidence(0.95))
// Override at check time
.checkWithConfidence(0.99)
```

**Decision**: Option C - Support both strategy-level and check-level configuration.

**Rationale**:
- Strategy configuration is good for project-wide defaults
- Check-level is good for specific high-confidence tests
- Flexibility without complexity

### Decision 4: Statistics Structure

```typescript
interface FluentStatistics {
  // Basic (always collected)
  testsRun: number
  testsPassed: number
  testsDiscarded: number
  executionTimeMs: number
  
  // Confidence (calculated on demand)
  confidence?: number
  credibleInterval?: [number, number]
  
  // Labels (if any classify/label calls made)
  labels?: Record<string, number>
  
  // Coverage (if any cover calls made)
  coverageResults?: CoverageResult[]
  
  // Detailed (opt-in via withDetailedStatistics())
  arbitraryStats?: Record<string, ArbitraryStatistics>
}
```

**Decision**: Layered structure with optional detailed fields.

**Rationale**:
- Basic stats have minimal overhead
- Optional fields don't bloat simple cases
- Clear upgrade path to detailed analysis

### Decision 5: Default Behavior

**Options Considered**:
A. Statistics always on (full detail)
B. Statistics always off
C. Basic stats on, detailed off
D. Configurable default

**Decision**: Option C - Basic statistics on by default, detailed off.

**Rationale**:
- Basic stats (counts, time) have negligible overhead
- Users expect some feedback about test execution
- Detailed stats can have measurable overhead

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance overhead | Medium | Layered stats collection, opt-in detailed mode |
| API complexity | Medium | Follow QuickCheck patterns, comprehensive docs |
| Breaking changes | Low | All new features are additive |
| Statistical correctness | High | Unit tests against known distributions, property tests |

## Migration Plan

**Phase 1 - Foundation (non-breaking)**:
- Add `FluentStatistics` interface
- Add `statistics` field to `FluentResult` (default to basic stats)
- Implement basic stats collection in strategies

**Phase 2 - Classification (non-breaking)**:
- Add `classify()`, `label()`, `collect()` methods
- Add label tracking to stats

**Phase 3 - Coverage (non-breaking)**:
- Add `cover()` method
- Add `checkCoverage()` method
- Implement coverage verification

**Phase 4 - Confidence (non-breaking)**:
- Add `withConfidence()` to strategy factory
- Add `checkWithConfidence()` method
- Implement Bayesian stopping criterion

**Phase 5 - Advanced (opt-in)**:
- Add detailed arbitrary statistics
- Add adaptive sampling strategy
- Add verbose reporting mode

## Open Questions

1. **Prior selection**: Should users be able to specify the prior distribution, or is Uniform always appropriate?

2. **Confidence definition**: Is "P(success rate > 1 - 10^-6)" a reasonable proxy for "property holds for all inputs"?

3. **Interaction with shrinking**: When confidence-based stopping finds a failure and starts shrinking, should confidence be recalculated?

4. **Discard handling**: How should discarded tests (filtered by preconditions) affect confidence calculations?

5. **Label cardinality**: Should there be a warning if labels have very high cardinality (e.g., one label per test)?
