## ADDED Requirements

### Requirement: Confidence Calculation

The system SHALL provide methods to calculate Bayesian confidence in property satisfaction.

#### Scenario: Calculate posterior probability
- **WHEN** n tests have passed and k have failed
- **THEN** the system SHALL calculate the posterior probability that the property holds
- **AND** use a uniform prior Beta(1, 1) by default
- **AND** calculate posterior as Beta(n - k + 1, k + 1)

#### Scenario: Confidence definition
- **WHEN** confidence is calculated
- **THEN** confidence SHALL be P(θ > 1 - ε) where ε is a small tolerance
- **AND** default ε SHALL be 10^-6

#### Scenario: Credible interval
- **WHEN** confidence is calculated
- **THEN** a 95% credible interval SHALL be provided by default
- **AND** interval bounds SHALL be Beta quantiles

#### Scenario: Confidence after failure
- **WHEN** a counterexample is found (k > 0)
- **THEN** confidence SHALL be 0
- **AND** the property is falsified
