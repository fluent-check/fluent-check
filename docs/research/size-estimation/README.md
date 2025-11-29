# Size Estimation Research

Mathematical analysis of arbitrary size (codomain cardinality) estimation in FluentCheck.

## Background

Accurate size estimation is essential for:
- Calculating confidence levels in test results
- Optimizing sampling strategies (e.g., exhaustive vs. random)
- Detecting when arbitraries have empty or near-empty domains
- Providing statistical guarantees to users

## Documents

| Document | Related Issue | Topic |
|----------|---------------|-------|
| [mapped-arbitrary-analysis.md](./mapped-arbitrary-analysis.md) | [#8](https://github.com/fluent-check/fluent-check/issues/8) | Codomain estimation for non-bijective mappings |
| [filter-arbitrary-analysis.md](./filter-arbitrary-analysis.md) | [#9](https://github.com/fluent-check/fluent-check/issues/9) | Bayesian size estimation for filtered arbitraries |

## Parent Issue

These analyses are part of [#6 - Provide size estimation (codomain cardinality) in Arbitraries](https://github.com/fluent-check/fluent-check/issues/6).

## Key Findings Summary

### Mapped Arbitraries (#8)

**Problem:** `arb.map(f)` returns base size, incorrect for non-bijective `f`.

**Approaches:**
1. Exact enumeration for small domains
2. Birthday paradox estimator for sampling
3. HyperLogLog for streaming/large domains

### Filtered Arbitraries (#9)

**Problem:** Current implementation uses Beta mode, which can fall outside credible interval.

**Recommendations:**
1. Use **median** instead of mode for point estimation
2. Use **Beta-Binomial** when base size is small and exact
3. Keep equal-tailed credible intervals (consistent with median)

**Validation:** Monte Carlo simulations proposed to empirically validate:
- Credible interval coverage (should be ~95%)
- Point estimator comparison (mode vs mean vs median)
- Beta vs Beta-Binomial accuracy for small domains
- Prior sensitivity analysis
- Edge case handling (s=0, s=k)

## Status

- [x] Initial mathematical analysis drafted
- [x] Key assumptions identified and documented
- [x] Monte Carlo validation simulations proposed
- [ ] Implementation of validation simulations
- [ ] Implementation proposals
- [ ] Integration with codebase
