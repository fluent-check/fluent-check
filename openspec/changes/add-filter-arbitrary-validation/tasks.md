## 1. Setup Simulation Infrastructure

- [x] 1.1 Create `test/simulations/` directory
- [x] 1.2 Create `test/simulations/filter-arbitrary-validation.ts` test file
- [x] 1.3 Add helper functions for random binomial generation
- [x] 1.4 Add helper functions for statistical metrics (bias, MSE, MAE)
- [x] 1.5 Add configuration interface for simulation parameters
- [x] 1.6 Add default parameter values from analysis document

## 2. Implement Simulation 1: Credible Interval Coverage

- [x] 2.1 Implement `simulateCoverage()` function
- [x] 2.2 Test across multiple true proportions (0.01 to 0.99)
- [x] 2.3 Test across multiple sample sizes (10 to 500)
- [x] 2.4 Add statistical test to verify coverage ≈ 0.95 (with Monte Carlo error tolerance)
- [x] 2.5 Add test cases for edge cases (very small/large p, small k)

## 3. Implement Simulation 2: Point Estimator Comparison

- [x] 3.1 Implement `compareEstimators()` function
- [x] 3.2 Compute bias, MSE, MAE for mode, mean, and median
- [x] 3.3 Track "outside CI" rate for each estimator
- [x] 3.4 Add assertions that median performs as well or better than mode
- [x] 3.5 Add assertions that median is always inside CI (by construction)

## 4. Implement Simulation 3: Mode-Outside-CI Rate

- [x] 4.1 Implement `simulateModeOutsideCI()` function
- [x] 4.2 Track how often mode falls outside equal-tailed CI
- [x] 4.3 Verify high outside-CI rate for extreme p and small k
- [x] 4.4 Add test cases for boundary conditions (s=0, s=k)

## 5. Implement Simulation 4: Beta vs Beta-Binomial Comparison

- [x] 5.1 Implement `compareBetaVsBetaBinomial()` function
- [x] 5.2 Compare MSE and coverage for both distributions
- [x] 5.3 Test across multiple base sizes (10 to 1000)
- [x] 5.4 Verify Beta-Binomial performs better for n < 100
- [x] 5.5 Verify negligible difference for n > 100

## 6. Implement Simulation 5: CI Width Formula Validation

- [x] 6.1 Implement `validateCIWidthFormula()` function
- [x] 6.2 Compare empirical CI width to theoretical formula (4/√k)
- [x] 6.3 Compute ratio of empirical to theoretical width
- [x] 6.4 Verify ratio is approximately 1.0 for moderate p (0.3-0.7)
- [x] 6.5 Document deviations for extreme p values

## 7. Implement Simulation 6: Edge Cases

- [x] 7.1 Implement `validateEdgeCases()` function
- [x] 7.2 Test zero successes (s=0, k=10)
- [x] 7.3 Test all successes (s=k, k=10)
- [x] 7.4 Test one success (s=1, k=100)
- [x] 7.5 Test near-certain (s=99, k=100)
- [x] 7.6 Verify mode, mean, median, and CI values match analytical expectations

## 8. Implement Simulation 7: Prior Sensitivity Analysis

- [x] 8.1 Implement `priorSensitivityAnalysis()` function
- [x] 8.2 Test multiple priors (uninformative, Jeffreys, pessimistic, optimistic, concentrated)
- [x] 8.3 Verify all priors converge to similar estimates as k → ∞
- [x] 8.4 Document differences for small k (< 20)

## 9. Implement Simulation 8: Incremental Update Validation

- [x] 9.1 Implement `validateIncrementalUpdates()` function
- [x] 9.2 Compare batch processing vs incremental updates
- [x] 9.3 Verify 100% match between methods
- [x] 9.4 Test across multiple trial configurations

## 10. Add Statistical Test Framework

- [x] 10.1 Add chi-squared test for coverage validation
- [x] 10.2 Add tolerance calculations for Monte Carlo error
- [x] 10.3 Add pass/fail criteria based on analysis document thresholds
- [x] 10.4 Add helper to compute confidence intervals for simulation results

## 11. Integration and Documentation

- [x] 11.1 Add Mocha test suite structure
- [x] 11.2 Add descriptive test names for each simulation
- [x] 11.3 Document simulation parameters and pass criteria
- [x] 11.4 Add comments explaining each simulation's purpose
- [x] 11.5 Verify all tests pass with default parameters

## 12. Optional: Visualization Support

- [ ] 12.1 Add optional visualization output (histograms, scatter plots)
- [ ] 12.2 Create helper functions to generate visualization data
- [ ] 12.3 Document how to enable visualization mode

Note: Visualization support is marked as optional and can be implemented in a future enhancement.
