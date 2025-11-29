# Change: Add Confidence-Based Termination

> **GitHub Issue:** [#458](https://github.com/fluent-check/fluent-check/issues/458)

## Why

Currently, FluentCheck runs a fixed number of tests regardless of whether sufficient confidence has been achieved. This is suboptimal because:

1. **Over-testing**: Simple properties may reach 99.99% confidence long before the sample limit
2. **Under-testing**: Complex properties may need more samples than the fixed limit allows
3. **No statistical guarantee**: Users cannot specify "run until X% confident the property holds"

For critical systems, users need to specify confidence levels (e.g., "run until 99.9% confident") rather than arbitrary sample counts.

Issue [#418](https://github.com/fluent-check/fluent-check/issues/418) proposes adding Bayesian confidence-based termination using FluentCheck's existing Beta distribution statistics.

## What Changes

- **Add `withConfidence(level)` to strategy builder** for target confidence
- **Add `withMinConfidence(level)`** for minimum confidence threshold
- **Add `checkWithConfidence(level)` terminal method** for one-shot confidence checks
- **Add `confidence` and `credibleInterval` to FluentStatistics** output
- **Implement Bayesian confidence calculation** using Beta distribution posterior

### API Design

```typescript
// Run until 99% confident
fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.99)
    .withMaxIterations(50000))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// Minimum confidence - continue past sample size if confidence too low
fc.scenario()
  .config(fc.strategy()
    .withMinConfidence(0.95)
    .withSampleSize(1000))
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

// One-shot terminal method
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)

console.log(result.statistics.confidence)       // 0.9992
console.log(result.statistics.testsRun)         // 6905 (variable)
console.log(result.statistics.credibleInterval) // [0.9995, 1.0]
```

### Bayesian Confidence Model

Using Beta distribution posterior:
- Prior: Beta(1, 1) = Uniform (no prior knowledge)
- After n successes, 0 failures: Beta(n+1, 1)
- Confidence = P(p > threshold | data) where p is true pass rate

```typescript
// Confidence that property holds with >99.9% probability
const posterior = new BetaDistribution(successes + 1, failures + 1)
const confidence = 1 - posterior.cdf(0.999)
```

## Impact

- **Affected specs**: `specs/statistics/spec.md`, `specs/strategies/spec.md`
- **Affected code**:
  - `src/strategies/FluentStrategyFactory.ts` - Configuration methods
  - `src/strategies/FluentStrategy.ts` - Termination logic
  - `src/statistics/FluentStatistics.ts` - Confidence calculation
  - `src/FluentCheck.ts` - New terminal method
- **Breaking change**: No - additive only, default behavior unchanged
- **Performance**: < 5% overhead for confidence calculation

## Complexity Estimate

**Medium Complexity** (1-2 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| Strategy configuration | Low | Builder methods |
| Confidence calculation | Medium | Beta distribution math |
| Termination logic | Medium | Integration with test loop |
| `checkWithConfidence()` | Low | Convenience wrapper |
| Test updates | Medium | Verify statistical properties |

## Success Criteria

1. `withConfidence(0.99)` terminates when 99% confidence achieved
2. `withMinConfidence(0.95)` continues if confidence below threshold
3. Statistics output includes confidence and credible interval
4. Performance overhead is minimal (<5%)

## Related Issues

- [#418](https://github.com/fluent-check/fluent-check/issues/418) - Original proposal
- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Performance improvements
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance baseline

## Independence

This proposal is **independent**:
- No dependency on shrinking changes
- Orthogonal to generation optimizations
- Self-contained statistical feature
- Builds on existing Beta distribution infrastructure

## Research Reference

See `docs/research/statistical-ergonomics/` for full research on statistical foundations and API design considerations.
