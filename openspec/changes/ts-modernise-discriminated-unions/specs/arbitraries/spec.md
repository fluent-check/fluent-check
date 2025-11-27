# Arbitraries

## MODIFIED Requirements

### Requirement: Size Estimation

The system SHALL provide size information for arbitraries using a discriminated union type for exact and estimated sizes.

#### Scenario: Exact size
- **WHEN** `fc.integer(0, 10).size()` is called
- **THEN** an exact size with value 11 is returned
- **AND** the returned type SHALL be `ExactSize` with only `type` and `value` fields

#### Scenario: Estimated size
- **WHEN** a filtered arbitrary's size is queried
- **THEN** an estimated size with credible interval is returned
- **AND** the returned type SHALL be `EstimatedSize` with `type`, `value`, and `credibleInterval` fields

#### Scenario: Discriminated union type narrowing
- **WHEN** code checks `size.type === 'exact'`
- **THEN** TypeScript SHALL narrow the type to exclude `credibleInterval` field access
- **AND** exhaustive switch statements on `size.type` SHALL be type-safe

#### Scenario: Factory functions for size creation
- **WHEN** creating size values programmatically
- **THEN** `exactSize(value)` SHALL return an `ExactSize` object
- **AND** `estimatedSize(value, interval)` SHALL return an `EstimatedSize` object
