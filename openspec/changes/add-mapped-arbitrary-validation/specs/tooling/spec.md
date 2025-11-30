## ADDED Requirements

### Requirement: Validation Simulation Infrastructure

The project SHALL provide Monte Carlo simulation infrastructure for validating statistical estimator assumptions before implementation.

#### Scenario: Simulation file location
- **WHEN** validation simulations are created
- **THEN** they SHALL be placed in `test/simulations/` directory
- **AND** named descriptively (e.g., `mapped-arbitrary-validation.ts`)

#### Scenario: Run simulations via npm script
- **WHEN** `npm run simulate:mapped-arbitrary` is executed
- **THEN** all mapped arbitrary validation simulations SHALL run
- **AND** results SHALL be output to console with pass/fail summary

#### Scenario: Configurable simulation parameters
- **WHEN** simulations are defined
- **THEN** key parameters (domain sizes, sample sizes, num trials) SHALL be configurable
- **AND** sensible defaults SHALL be provided

#### Scenario: Deterministic results with fixed seed
- **WHEN** simulations use random sampling
- **THEN** a fixed seed SHALL ensure reproducible results across runs

### Requirement: Fraction Estimator Validation

The system SHALL validate that the fraction estimator $\hat{m} = \frac{d}{k} \cdot n$ meets accuracy requirements.

#### Scenario: Accuracy for moderate codomain ratios
- **WHEN** Simulation 1 (Fraction Estimator Accuracy) runs
- **THEN** relative error SHALL be < 20% for codomain ratios 0.1–0.9
- **AND** Wilson score interval coverage SHALL be ≥ 80%

#### Scenario: Metrics computed per configuration
- **WHEN** simulation results are computed
- **THEN** bias, MSE, RMSE, relative error, and CI coverage SHALL be reported
- **AND** results SHALL be grouped by (domain size, codomain ratio, sample size)

### Requirement: Sample Size Formula Validation

The system SHALL validate that the sample size formula $k = \min(k_{\max}, 20\sqrt{n})$ provides adequate accuracy.

#### Scenario: Sample size adequacy
- **WHEN** Simulation 2 (Sample Size Adequacy) runs with $k = 20\sqrt{n}$
- **THEN** accuracy rate (estimates within 20% error) SHALL exceed 70%

#### Scenario: Diminishing returns identification
- **WHEN** multiple sample size multipliers are tested
- **THEN** a plateau in accuracy improvement SHALL be identifiable

### Requirement: Estimator Design Decision Validation

The system SHALL validate the design decision to use fraction estimator over birthday paradox estimator.

#### Scenario: Birthday paradox comparison
- **WHEN** Simulation 4 (Birthday Comparison) runs
- **THEN** fraction estimator SHALL have lower RMSE than birthday in ≥ 60% of configurations

#### Scenario: Birthday instability tracking
- **WHEN** birthday paradox estimator is evaluated
- **THEN** explosion rate (d = k) and instability rate (k - d ≤ 2) SHALL be reported
- **AND** these SHALL be higher than fraction estimator failure modes

### Requirement: Edge Case Validation

The system SHALL validate correct behavior for pathological mapping functions.

#### Scenario: Constant function
- **WHEN** $f(x) = c$ for all $x$ in domain
- **THEN** observed distinct count $d$ SHALL always equal 1

#### Scenario: Binary function
- **WHEN** $f(x) = x \mod 2$
- **THEN** observed distinct count $d$ SHALL always equal 2 (for $n \geq 2$)

#### Scenario: Near-bijective function
- **WHEN** $f$ is identity except for a single collision
- **THEN** estimation SHALL not produce order-of-magnitude errors

#### Scenario: Identity (bijective) function
- **WHEN** $f(x) = x$ (bijective)
- **THEN** underestimation of ~5% is acceptable due to sampling collision effects
- **AND** estimate SHALL be > 90% of true domain size for typical sample sizes

### Requirement: Uniform Sampling Validation

The system SHALL validate that uniform (not biased) sampling is critical for cluster/step functions.

#### Scenario: Cluster mapping accuracy with uniform sampling
- **WHEN** Simulation 8 (Cluster Mapping) runs with $f(x) = \lfloor x / k \rfloor$
- **THEN** uniform sampling SHALL produce < 20% relative error

#### Scenario: Biased sampling degradation
- **WHEN** sampling is biased toward edge values (0, n-1)
- **THEN** estimation accuracy SHALL degrade measurably compared to uniform
- **AND** this validates the requirement for `sampleUniform()` in implementation

### Requirement: Simulation Result Reporting

The system SHALL provide clear reporting of simulation outcomes.

#### Scenario: Pass/fail summary
- **WHEN** simulations complete
- **THEN** a summary table SHALL show pass/fail status for each simulation
- **AND** key metrics SHALL be displayed (actual vs threshold)

#### Scenario: CSV export for analysis
- **WHEN** detailed analysis is needed
- **THEN** results SHALL be exportable to CSV format
- **AND** all configuration parameters and metrics SHALL be included
