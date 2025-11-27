# Arbitraries

## ADDED Requirements

### Requirement: Integer Preset Factories

The system SHALL provide shorthand factories for common integer ranges.

#### Scenario: Positive integer generation
- **WHEN** `fc.positiveInt()` is called
- **THEN** it SHALL return an arbitrary that generates integers >= 1
- **AND** the maximum value SHALL be `Number.MAX_SAFE_INTEGER`

#### Scenario: Negative integer generation
- **WHEN** `fc.negativeInt()` is called
- **THEN** it SHALL return an arbitrary that generates integers <= -1
- **AND** the minimum value SHALL be `Number.MIN_SAFE_INTEGER`

#### Scenario: Non-zero integer generation
- **WHEN** `fc.nonZeroInt()` is called
- **THEN** it SHALL return an arbitrary that never generates 0
- **AND** it SHALL generate both positive and negative integers

#### Scenario: Byte generation
- **WHEN** `fc.byte()` is called
- **THEN** it SHALL return an arbitrary that generates integers in range [0, 255]

### Requirement: String Preset Factories

The system SHALL provide shorthand factories for common string patterns.

#### Scenario: Non-empty string generation
- **WHEN** `fc.nonEmptyString(maxLength?)` is called
- **THEN** it SHALL return an arbitrary that generates strings with length >= 1
- **AND** the maximum length SHALL default to 100 if not specified

### Requirement: Collection Preset Factories

The system SHALL provide shorthand factories for common collection patterns.

#### Scenario: Non-empty array generation
- **WHEN** `fc.nonEmptyArray(arb, maxLength?)` is called
- **THEN** it SHALL return an arbitrary that generates arrays with length >= 1
- **AND** elements SHALL be generated from the provided arbitrary

#### Scenario: Pair generation
- **WHEN** `fc.pair(arb)` is called
- **THEN** it SHALL return an arbitrary that generates 2-tuples
- **AND** both elements SHALL be generated from the same arbitrary

### Requirement: Nullable/Optional Factories

The system SHALL provide factories for nullable and optional value generation.

#### Scenario: Nullable value generation
- **WHEN** `fc.nullable(arb)` is called
- **THEN** it SHALL return an arbitrary that generates values of type `T | null`
- **AND** it SHALL sometimes generate `null`

#### Scenario: Optional value generation
- **WHEN** `fc.optional(arb)` is called
- **THEN** it SHALL return an arbitrary that generates values of type `T | undefined`
- **AND** it SHALL sometimes generate `undefined`
