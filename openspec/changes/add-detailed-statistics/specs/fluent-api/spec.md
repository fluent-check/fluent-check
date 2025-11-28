## ADDED Requirements

### Requirement: Verbose Check Options

The system SHALL provide check options for controlling output.

#### Scenario: Verbose check
- **WHEN** `.check({ verbose: true })` is called
- **THEN** statistics SHALL be logged to the console during and after execution

#### Scenario: Log statistics
- **WHEN** `.check({ logStatistics: true })` is called
- **THEN** a summary of statistics SHALL be logged after completion

#### Scenario: Custom reporter
- **WHEN** `.check({ reporter: fn })` is called
- **THEN** the custom reporter function SHALL be called with the result
