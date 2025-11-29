## ADDED Requirements

### Requirement: Confidence-Based Termination

The system SHALL support terminating test execution when sufficient statistical confidence is achieved.

#### Scenario: Terminate at target confidence
- **WHEN** `.withConfidence(0.99)` is configured
- **AND** test execution achieves 99% confidence that property holds
- **THEN** execution terminates early (before sample size limit)

#### Scenario: Continue until minimum confidence
- **WHEN** `.withMinConfidence(0.95)` is configured
- **AND** sample size is reached but confidence is below 95%
- **THEN** execution continues until confidence threshold is met
- **OR** maximum iterations limit is reached

#### Scenario: Safety upper bound
- **WHEN** confidence-based termination is enabled
- **AND** `.withMaxIterations(50000)` is configured
- **THEN** execution never exceeds 50000 iterations regardless of confidence

### Requirement: Confidence Terminal Method

The system SHALL provide a convenience method for confidence-based checking.

#### Scenario: Check with confidence
- **WHEN** `.checkWithConfidence(0.999)` is called
- **THEN** property is tested until 99.9% confidence is achieved
- **AND** result includes confidence and credible interval statistics
