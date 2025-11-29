## ADDED Requirements

### Requirement: Exhaustive Generation Mode

The system SHALL support exhaustive enumeration of small arbitrary domains instead of random sampling.

#### Scenario: Enable exhaustive generation
- **WHEN** `.withExhaustive(true)` is called on strategy builder
- **AND** the arbitrary supports enumeration (has finite, small domain)
- **THEN** all possible values are tested instead of random samples

#### Scenario: Auto-exhaustive based on threshold
- **WHEN** `.withExhaustiveThreshold(100)` is called on strategy builder
- **AND** an arbitrary's `size()` estimate is ≤ 100
- **THEN** exhaustive enumeration is used for that arbitrary

#### Scenario: Fallback for large arbitraries
- **WHEN** exhaustive mode is enabled
- **AND** an arbitrary's domain exceeds the threshold or is unbounded
- **THEN** random sampling is used as fallback

### Requirement: Arbitrary Enumeration

The system SHALL provide an `enumerate()` method on arbitraries with finite domains.

#### Scenario: Enumerate integer range
- **WHEN** `fc.integer(0, 5).enumerate()` is called
- **THEN** an iterable of [0, 1, 2, 3, 4, 5] is returned

#### Scenario: Enumerate boolean
- **WHEN** `fc.boolean().enumerate()` is called
- **THEN** an iterable of [false, true] is returned

#### Scenario: Enumerate non-enumerable arbitrary
- **WHEN** `fc.string().enumerate()` is called
- **THEN** null is returned (indicating enumeration not supported)

#### Scenario: Enumerate tuple
- **WHEN** `fc.tuple(fc.boolean(), fc.integer(0, 2)).enumerate()` is called
- **THEN** all 6 combinations are returned: [false,0], [false,1], [false,2], [true,0], [true,1], [true,2]
