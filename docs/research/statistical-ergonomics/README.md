# Research: Statistical Ergonomics for FluentCheck

This directory contains research findings and design documents for enhancing FluentCheck with user-facing statistical features.

## Summary

FluentCheck has sophisticated statistical foundations (Beta and Beta-Binomial distributions, Bayesian size estimation) that are currently internal implementation details. This research proposes exposing these capabilities through an ergonomic API, enabling users to:

1. **Classify test cases** - Label and categorize generated inputs
2. **Verify coverage** - Ensure important categories are adequately tested  
3. **Set confidence levels** - Run tests until statistical confidence is achieved
4. **View statistics** - Get detailed metrics about test execution

## Documents

| Document | Description |
|----------|-------------|
| [Framework Comparison](framework-comparison.md) | Analysis of QuickCheck, Hypothesis, fast-check, and JSVerify statistical features |
| [API Design](api-design.md) | Proposed APIs with TypeScript interfaces and usage examples |
| [Statistical Foundations](statistical-foundations.md) | Mathematical foundations for Bayesian confidence and coverage verification |
| [Performance Analysis](performance-analysis.md) | Overhead analysis and optimization strategies |
| [Implementation Roadmap](implementation-roadmap.md) | Phased implementation plan with tasks and timeline |

## Key Findings

### Framework Comparison

| Feature | QuickCheck | Hypothesis | fast-check | FluentCheck (Current) |
|---------|-----------|------------|------------|----------------------|
| Label/Classify | ✅ | ✅ | ✅ | ❌ |
| Coverage Requirements | ✅ | ❌ | ❌ | ❌ |
| Confidence-Based Stopping | ✅ | ❌ | ❌ | ❌ |
| Statistics in Result | ✅ | ✅ | ✅ | ❌ (seed only) |

**Conclusion**: FluentCheck lags behind mature frameworks in exposing statistical features to users.

### Proposed API (Examples)

```typescript
// Classification
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 10, 'small')
  .then(({xs}) => xs.sort().length === xs.length)
  .check()
// result.statistics.labels = { empty: 150, small: 420, ... }

// Coverage requirements
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()

// Confidence-based termination
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)
// Runs until 99.9% confidence achieved
```

### Performance Impact

| Feature | Overhead | Default |
|---------|----------|---------|
| Basic statistics | <1% | On |
| Classification | 1-3% | When used |
| Coverage checking | 2-5% | When used |
| Detailed stats | 5-10% | Opt-in |

**Conclusion**: Statistics can be implemented with acceptable overhead using lazy initialization and streaming algorithms.

### Implementation Phases

1. **Phase 1 - Foundation** (1-2 days): FluentStatistics interface, statistics in FluentResult
2. **Phase 2 - Classification** (2-3 days): classify(), label(), collect() methods
3. **Phase 3 - Coverage** (3-4 days): cover(), checkCoverage() with statistical verification
4. **Phase 4 - Confidence** (3-4 days): withConfidence(), checkWithConfidence()
5. **Phase 5 - Advanced** (4-5 days): Detailed arbitrary stats, verbosity, enhanced reporting

**Total estimated**: 2-4 weeks

## Design Decisions

1. **Classification API**: QuickCheck-style fluent methods (`classify`, `label`, `collect`)
2. **Coverage API**: Separate `cover()` and `checkCoverage()` methods
3. **Confidence API**: Both strategy-level (`withConfidence`) and check-level (`checkWithConfidence`)
4. **Statistics structure**: Layered with optional detailed fields
5. **Default behavior**: Basic stats on, detailed stats opt-in

## Backwards Compatibility

All changes are additive. Existing code continues to work without modification:

```typescript
// This still works exactly as before
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

// result.satisfiable, result.example, result.seed unchanged
// result.statistics is NEW but doesn't break anything
```

## Related Work

- QuickCheck (Haskell): Gold standard for PBT statistics
- Hypothesis (Python): Health checks, statistics phases
- fast-check (JavaScript): Basic statistics, verbose mode
- Academic: Bayesian stopping rules, sequential testing

## Next Steps

1. Review and approve API designs
2. Implement Phase 1 (Foundation) as MVP
3. Gather user feedback
4. Iterate on design if needed
5. Continue with subsequent phases

## Files

```
statistical-ergonomics/
├── README.md                    # This file
├── framework-comparison.md      # Framework analysis
├── api-design.md               # Proposed APIs
├── statistical-foundations.md   # Mathematical foundations
├── performance-analysis.md      # Performance analysis
├── implementation-roadmap.md    # Implementation plan
└── examples/                    # Usage examples
    ├── classification.ts
    ├── coverage.ts
    └── confidence.ts
```
