## ADDED Requirements

### Requirement: Statistical Model Validation

The system SHALL provide Monte Carlo simulation tests to validate the correctness of statistical models used in size estimation.

#### Scenario: Credible interval coverage validation
- **WHEN** a credible interval coverage simulation is run
- **THEN** it SHALL verify that 95% credible intervals contain the true proportion approximately 95% of the time (within Monte Carlo error tolerance)
- **AND** it SHALL test across multiple true proportions (0.01 to 0.99)
- **AND** it SHALL test across multiple sample sizes (10 to 500)

#### Scenario: Point estimator comparison
- **WHEN** a point estimator comparison simulation is run
- **THEN** it SHALL compare mode, mean, and median estimators on bias, MSE, and MAE metrics
- **AND** it SHALL verify that median performs as well or better than mode
- **AND** it SHALL verify that median is always inside the credible interval (by construction)
- **AND** it SHALL track the rate at which mode falls outside the credible interval

#### Scenario: Mode outside CI validation
- **WHEN** a mode-outside-CI simulation is run
- **THEN** it SHALL verify that mode can fall outside equal-tailed credible intervals for skewed distributions
- **AND** it SHALL demonstrate high outside-CI rates for extreme proportions (p < 0.1 or p > 0.9) with small sample sizes

#### Scenario: Beta vs Beta-Binomial comparison
- **WHEN** a Beta vs Beta-Binomial comparison simulation is run
- **THEN** it SHALL compare MSE and coverage metrics for both distributions
- **AND** it SHALL verify that Beta-Binomial performs better for small exact base sizes (n < 100)
- **AND** it SHALL verify that the difference is negligible for large base sizes (n > 100)

#### Scenario: CI width formula validation
- **WHEN** a CI width formula validation simulation is run
- **THEN** it SHALL compare empirical credible interval width to the theoretical formula (4/√k)
- **AND** it SHALL verify that the ratio is approximately 1.0 for moderate proportions (0.3-0.7)
- **AND** it SHALL document expected deviations for extreme proportion values

#### Scenario: Edge case validation
- **WHEN** an edge case validation simulation is run
- **THEN** it SHALL test zero successes (s=0)
- **AND** it SHALL test all successes (s=k)
- **AND** it SHALL test rare events (s=1, k=100)
- **AND** it SHALL verify that mode, mean, median, and credible interval values match analytical expectations

#### Scenario: Prior sensitivity analysis
- **WHEN** a prior sensitivity analysis simulation is run
- **THEN** it SHALL test multiple prior distributions (uninformative, Jeffreys, pessimistic, optimistic, concentrated)
- **AND** it SHALL verify that all priors converge to similar estimates as sample size increases
- **AND** it SHALL document differences observed for small sample sizes

#### Scenario: Incremental update validation
- **WHEN** an incremental update validation simulation is run
- **THEN** it SHALL compare batch processing to incremental Bayesian updates
- **AND** it SHALL verify that both methods produce identical results (100% match)
- **AND** it SHALL validate that the implementation correctly accumulates evidence

### Requirement: Simulation Test Infrastructure

The system SHALL provide a test infrastructure for running statistical validation simulations.

#### Scenario: Simulation test file location
- **WHEN** validation simulations are implemented
- **THEN** they SHALL be located in `test/simulations/filter-arbitrary-validation.ts`

#### Scenario: Configurable simulation parameters
- **WHEN** a simulation is run
- **THEN** it SHALL accept configurable parameters for true proportions, sample sizes, base sizes, and number of trials
- **AND** it SHALL provide default parameter values as specified in the analysis document

#### Scenario: Statistical test framework
- **WHEN** simulation results are evaluated
- **THEN** the framework SHALL provide statistical tests (e.g., chi-squared for coverage) to determine pass/fail
- **AND** it SHALL account for Monte Carlo error in pass/fail criteria
- **AND** it SHALL compute confidence intervals for simulation results themselves

#### Scenario: Pass/fail criteria
- **WHEN** a simulation completes
- **THEN** it SHALL use pass criteria from the analysis document:
  - Coverage: 0.93–0.97 for 95% CI
  - Estimator comparison: Median ≤ Mode on metrics
  - Mode-outside-CI: >5% for extreme p, small k
  - Beta vs Beta-Binomial: BB better for n < 100
  - CI width formula: Ratio 0.7–1.5 for moderate p
  - Edge cases: Match analytical expectations
  - Prior sensitivity: Estimates converge as k → ∞
  - Incremental updates: 100% match
