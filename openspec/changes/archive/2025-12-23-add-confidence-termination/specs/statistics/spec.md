## ADDED Requirements

### Requirement: Confidence Calculation

The system SHALL calculate Bayesian confidence that a property holds based on test results.

#### Scenario: Calculate confidence after successful tests
- **WHEN** 1000 tests pass with 0 failures
- **THEN** `statistics.confidence` reflects high probability (>0.99) that property holds
- **AND** confidence is calculated using Beta distribution posterior
- **AND** confidence represents P(pass_rate > threshold | data) where threshold defaults to 0.999

#### Scenario: Calculate confidence after mixed results
- **WHEN** 990 tests pass and 10 fail
- **THEN** `statistics.confidence` reflects lower probability
- **AND** confidence accurately represents uncertainty
- **AND** confidence decreases appropriately with failures

#### Scenario: Confidence increases with more tests
- **WHEN** a property passes consistently
- **AND** confidence is calculated after 100 tests and again after 1000 tests
- **THEN** confidence after 1000 tests is higher than after 100 tests
- **AND** the increase reflects the additional evidence

#### Scenario: Confidence uses configured pass-rate threshold
- **WHEN** confidence is calculated with `withPassRateThreshold(0.99)` vs default (0.999)
- **AND** the same test results are used
- **THEN** the 0.99 threshold produces higher confidence than 0.999
- **AND** both calculations use the same Beta distribution posterior

### Requirement: Credible Interval

The system SHALL provide credible intervals for the true property pass rate.

#### Scenario: Compute credible interval
- **WHEN** test results are available
- **THEN** `statistics.credibleInterval` provides a 95% credible interval
- **AND** the interval is derived from the Beta distribution posterior

#### Scenario: Narrow interval with many tests
- **WHEN** 10000 tests pass with 0 failures
- **THEN** the credible interval is narrow (e.g., [0.9997, 1.0])
