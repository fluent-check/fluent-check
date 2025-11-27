## ADDED Requirements

### Requirement: Statistical Check Variants

The system SHALL provide check variants with statistical features.

#### Scenario: Check with confidence
- **WHEN** `.checkWithConfidence(level)` is called
- **THEN** testing SHALL continue until the confidence level is achieved
- **AND** `result.statistics.confidence` SHALL meet or exceed the level

#### Scenario: Confidence options
- **WHEN** `.checkWithConfidence(level, { maxTests: 50000 })` is called
- **THEN** testing SHALL stop at maxTests if confidence not achieved
- **AND** result SHALL include actual confidence achieved

#### Scenario: Confidence in regular check
- **WHEN** `.check()` is called after tests complete
- **THEN** `result.statistics.confidence` SHALL contain the calculated confidence
- **AND** `result.statistics.credibleInterval` SHALL contain the credible interval
