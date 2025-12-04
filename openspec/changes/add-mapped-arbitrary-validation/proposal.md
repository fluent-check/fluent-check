# Change: Add Mapped Arbitrary Validation Simulations

> **GitHub Issue:** [#467](https://github.com/fluent-check/fluent-check/issues/467)

## Why

The mapped arbitrary size estimation design (`docs/research/size-estimation/mapped-arbitrary-analysis.md`) relies on mathematical assumptions (A1–A5) that have not been empirically validated. Before implementing the fraction-based estimator in production code, Monte Carlo simulations must confirm:

1. The estimator produces accurate results for moderate codomain ratios
2. The proposed sample size formula ($k = 20\sqrt{n}$) is sufficient
3. Edge cases (constant, bijective, cluster functions) behave correctly
4. The design decision to use fraction over birthday-paradox is sound

Without validation, we risk shipping an estimator that fails silently for common use cases.

## What Changes

- **Add** 8 Monte Carlo validation simulations in `test/simulations/mapped-arbitrary-validation.ts`
- **Add** a new `simulations` capability in tooling spec for pre-implementation validation infrastructure
- **Add** npm script `npm run simulate:mapped-arbitrary` to run validations

### Simulations Delivered

| # | Simulation | Validates | Priority |
|---|------------|-----------|----------|
| 1 | Fraction Estimator Accuracy | Assumption A4 | High |
| 2 | Sample Size Adequacy | Assumption A5 | Medium |
| 3 | Balanced vs Unbalanced Functions | A4 robustness | Low |
| 4 | Birthday Paradox Comparison | Design decision | High |
| 5 | Enumeration Threshold Trade-off | Configuration | Medium |
| 6 | Edge Cases & Pathological Functions | Boundary behavior | High |
| 7 | Chained Map Composition | Composition semantics | Low |
| 8 | Cluster Mapping (Step Functions) | Assumption A2 | High |

### Pass Criteria

Simulations are "good enough for a `size()` hint", not statistically optimal:

- **Simulation 1**: < 20% relative error for 0.1–0.9 codomain ratios; CI coverage ≥ 80%
- **Simulation 4**: Fraction estimator ≤ Birthday in ≥ 60% of cases
- **Simulation 6**: Constants/binary always exact; no order-of-magnitude errors
- **Simulation 8**: Uniform sampling < 20% error; biased shows measurable degradation

## Impact

- **Affected specs**: tooling (new simulation infrastructure capability)
- **Affected code**: `test/simulations/` (new directory), `package.json` (new script)
- **Dependencies**: None (pure TypeScript implementation, no external libs)
- **Risk**: Low — read-only validation that doesn't modify production code
