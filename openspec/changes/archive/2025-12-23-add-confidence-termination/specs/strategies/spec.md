## ADDED Requirements

### Requirement: Confidence-Based Termination

The system SHALL support terminating test execution when sufficient statistical confidence is achieved.

#### Scenario: Terminate at target confidence
- **WHEN** `.withConfidence(0.99)` is configured
- **AND** test execution achieves 99% confidence that property holds
- **THEN** execution terminates early (before sample size limit)
- **AND** the number of tests run is less than the configured sample size

#### Scenario: Higher confidence requires more tests
- **WHEN** the same property is tested with `.withConfidence(0.90)` and `.withConfidence(0.99)`
- **THEN** the 0.99 confidence test runs more tests than the 0.90 confidence test
- **AND** both achieve their respective confidence thresholds

#### Scenario: Continue until minimum confidence
- **WHEN** `.withMinConfidence(0.95)` is configured
- **AND** sample size is reached but confidence is below 95%
- **THEN** execution continues until confidence threshold is met
- **OR** maximum iterations limit is reached

#### Scenario: Safety upper bound
- **WHEN** confidence-based termination is enabled
- **AND** `.withMaxIterations(50000)` is configured
- **THEN** execution never exceeds 50000 iterations regardless of confidence

### Requirement: Pass-Rate Threshold Configuration

The system SHALL allow configuring the pass-rate threshold used for confidence calculation.

#### Scenario: Configure pass-rate threshold
- **WHEN** `.withPassRateThreshold(0.99)` is configured
- **THEN** confidence is calculated as P(pass_rate > 0.99 | data)
- **AND** this produces different confidence values than the default threshold (0.999)

#### Scenario: Default pass-rate threshold
- **WHEN** no pass-rate threshold is configured
- **THEN** the default threshold of 0.999 (99.9%) is used
- **AND** confidence represents P(pass_rate > 0.999 | data)

#### Scenario: Stricter threshold lowers confidence
- **WHEN** the same test results are evaluated with thresholds 0.99 and 0.999
- **THEN** the 0.999 threshold produces lower confidence than 0.99
- **AND** both use the same underlying statistical model

### Requirement: Confidence Terminal Method

The system SHALL provide a convenience method for confidence-based checking.

#### Scenario: Check with confidence
- **WHEN** `.checkWithConfidence(0.999)` is called
- **THEN** property is tested until 99.9% confidence is achieved
- **AND** result includes confidence and credible interval statistics

#### Scenario: Preserve factory configuration
- **WHEN** `.checkWithConfidence(0.95)` is called on a scenario configured with `.config(fc.strategy().withShrinking().withBias())`
- **THEN** the check uses shrinking and bias settings from the configured factory
- **AND** only confidence-related settings are overridden
- **AND** other factory settings (shrinking, bias, deduping, cache, seed) are preserved
