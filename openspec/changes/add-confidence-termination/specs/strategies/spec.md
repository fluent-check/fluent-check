## ADDED Requirements

### Requirement: Confidence-Based Termination

The system SHALL support terminating test execution based on statistical confidence.

#### Scenario: Configure confidence level
- **WHEN** `.withConfidence(0.99)` is called on the strategy factory
- **THEN** tests SHALL run until 99% confidence is achieved
- **OR** until the maximum iteration limit is reached

#### Scenario: Minimum confidence
- **WHEN** `.withMinConfidence(0.95)` is called
- **THEN** tests SHALL continue past the sample size if confidence is below 95%

#### Scenario: Confidence with max iterations
- **WHEN** both confidence and sample size/max iterations are configured
- **THEN** testing SHALL stop when either threshold is reached first

#### Scenario: Efficient confidence checking
- **WHEN** confidence-based termination is enabled
- **THEN** confidence SHALL be checked in batches (not after every test)
- **AND** batch size SHALL increase as tests accumulate
