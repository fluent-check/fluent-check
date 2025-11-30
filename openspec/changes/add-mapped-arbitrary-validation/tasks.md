# Tasks: Add Mapped Arbitrary Validation Simulations

## 1. Infrastructure Setup
- [x] 1.1 Create `test/simulations/` directory structure
- [x] 1.2 Add `npm run simulate:mapped-arbitrary` script to package.json
- [x] 1.3 Create shared simulation utilities (seeded RNG, result aggregation)

## 2. High-Priority Simulations (Must Pass Before Implementation)
- [x] 2.1 Implement Simulation 1: Fraction Estimator Accuracy
  - Wilson score interval validation
  - Bias, RMSE, coverage metrics across domain sizes and codomain ratios
- [x] 2.2 Implement Simulation 4: Birthday Paradox Comparison
  - Compare fraction vs birthday estimator RMSE
  - Track explosion/instability rates
- [x] 2.3 Implement Simulation 6: Edge Cases & Pathological Functions
  - Constant, identity, binary, near-bijective, sqrt-collapse cases
  - Verify d always equals trueM for deterministic cases
- [x] 2.4 Implement Simulation 8: Cluster Mapping (Step Functions)
  - Validate uniform sampling accuracy for floor division functions
  - Compare uniform vs biased sampling degradation

## 3. Medium-Priority Simulations (Validate During Development)
- [x] 3.1 Implement Simulation 2: Sample Size Adequacy
  - Validate sample size multipliers and accuracy rates
- [x] 3.2 Implement Simulation 5: Enumeration Threshold Trade-off
  - Identify crossover point for enumeration vs sampling performance

## 4. Lower-Priority Simulations (Can Validate Post-Implementation)
- [x] 4.1 Implement Simulation 3: Balanced vs Unbalanced Functions
  - Exponential skew factor testing
  - Effective codomain size (perplexity) comparison
- [x] 4.2 Implement Simulation 7: Chained Map Composition
  - Error propagation through map chains

## 5. Documentation & Reporting
- [x] 5.1 Generate summary report with pass/fail criteria (console output)
- [x] 5.2 Document simulation results in analysis document
- [x] 5.3 Update PR description with key findings
