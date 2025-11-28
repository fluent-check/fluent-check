# Strategies

## ADDED Requirements

### Requirement: Strategy Presets

The system SHALL provide pre-configured strategy presets for common testing scenarios.

#### Scenario: Default strategy preset
- **WHEN** `fc.strategies.default` is used
- **THEN** it SHALL provide a balanced configuration for typical use cases

#### Scenario: Fast strategy preset
- **WHEN** `fc.strategies.fast` is used
- **THEN** it SHALL prioritize quick feedback over thorough coverage
- **AND** it SHALL use random sampling

#### Scenario: Thorough strategy preset
- **WHEN** `fc.strategies.thorough` is used
- **THEN** it SHALL maximize test coverage
- **AND** it SHALL enable random sampling
- **AND** it SHALL enable caching
- **AND** it SHALL enable shrinking
- **AND** it SHALL use sampling without replacement

#### Scenario: Minimal strategy preset
- **WHEN** `fc.strategies.minimal` is used
- **THEN** it SHALL generate a small number of samples (10)
- **AND** it SHALL be suitable for debugging

#### Scenario: Preset compatibility with config
- **WHEN** a strategy preset is passed to `scenario().config()`
- **THEN** the scenario SHALL use the preset's configuration
