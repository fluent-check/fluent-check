# Change: Add Statistical Sanity Checks for Filter Arbitrary Size Estimation

## Why

The filter arbitrary size estimation uses Bayesian inference with Beta and Beta-Binomial distributions. The mathematical analysis document (`docs/research/size-estimation/filter-arbitrary-analysis.md`) identifies several assumptions and recommendations that need empirical validation through Monte Carlo simulations.

Without validation, we cannot be confident that:
1. The Bayesian model correctly captures the sampling process
2. The recommended estimators (median vs mode) perform as expected
3. The credible intervals have proper coverage
4. Edge cases are handled correctly
5. The Beta vs Beta-Binomial choice is appropriate

These validation simulations serve as "statistical sanity checks" to ensure the mathematical model is sound before relying on it in production code.

## What Changes

- Add Monte Carlo simulation framework for validating statistical models
- Implement 8 validation simulations as defined in the analysis document:
  1. Credible Interval Coverage - validates 95% CI contains true proportion 95% of the time
  2. Point Estimator Comparison - compares mode, mean, and median on bias, MSE, MAE
  3. Mode-Outside-CI Rate - validates that mode can fall outside equal-tailed CI
  4. Beta vs Beta-Binomial Comparison - validates distribution choice for small n
  5. CI Width Formula Validation - validates planning formula accuracy
  6. Edge Cases - validates boundary behavior (s=0, s=k, k=0)
  7. Prior Sensitivity Analysis - validates convergence regardless of prior
  8. Incremental Update Validation - validates batch vs incremental updates match
- Add statistical test framework to determine pass/fail criteria
- Create test file `test/simulations/filter-arbitrary-validation.ts`
- Add configurable parameters for simulation runs
- Include visualization outputs for manual inspection (optional)

## Impact

- Affected specs: `statistics`
- Affected code: `test/simulations/` (new directory)
- Breaking: None - additive test infrastructure
- Testing: Validates correctness of statistical methods used in size estimation
