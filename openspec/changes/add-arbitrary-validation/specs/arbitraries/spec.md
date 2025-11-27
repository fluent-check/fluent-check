# Arbitraries Delta

## ADDED Requirements

### Requirement: InvalidArbitrary Type

The system SHALL provide an `InvalidArbitrary<Reason>` type representing a configuration error in arbitrary construction.

#### Scenario: InvalidArbitrary structure
- **WHEN** an `InvalidArbitrary` is created
- **THEN** it SHALL have a `_tag` property equal to `'invalid'`
- **AND** it SHALL have a `reason` property containing the error description

#### Scenario: InvalidArbitrary behavior
- **WHEN** methods are called on an `InvalidArbitrary`
- **THEN** `pick()` SHALL return `undefined`
- **AND** `size()` SHALL return `{ value: 0, type: 'exact', credibleInterval: [0, 0] }`
- **AND** `sample()` SHALL return an empty array
- **AND** `map()` SHALL return `InvalidArbitrary` with same reason
- **AND** `filter()` SHALL return `InvalidArbitrary` with same reason
- **AND** `chain()` SHALL return `InvalidArbitrary` with same reason

#### Scenario: Type guard
- **WHEN** `isInvalidArbitrary(arb)` is called
- **THEN** it SHALL return `true` if `arb._tag === 'invalid'`
- **AND** it SHALL narrow the type to `InvalidArbitrary`

### Requirement: InvalidArbitrary vs NoArbitrary Distinction

The system SHALL distinguish between legitimate empty sets and configuration errors.

#### Scenario: NoArbitrary for shrinking
- **WHEN** a shrink operation exhausts all possibilities
- **THEN** `NoArbitrary` SHALL be returned (not `InvalidArbitrary`)

#### Scenario: NoArbitrary for filters
- **WHEN** a filter eliminates all values from an arbitrary
- **THEN** `NoArbitrary` SHALL be returned (not `InvalidArbitrary`)

#### Scenario: InvalidArbitrary for user errors
- **WHEN** a public API factory function receives invalid configuration
- **THEN** `InvalidArbitrary` SHALL be returned with descriptive reason

## MODIFIED Requirements

### Requirement: Integer Arbitrary

The system SHALL provide an `integer(min?, max?)` function that creates an arbitrary generating integers within a range.

#### Scenario: Generate bounded integers
- **WHEN** `fc.integer(0, 100)` is called
- **THEN** all generated values SHALL be integers in [0, 100]

#### Scenario: Default bounds
- **WHEN** `fc.integer()` is called without arguments
- **THEN** the range defaults to [MIN_SAFE_INTEGER, MAX_SAFE_INTEGER]

#### Scenario: Invalid range returns InvalidArbitrary
- **WHEN** `fc.integer(10, 5)` is called (min > max)
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"integer: min (10) exceeds max (5)"`

#### Scenario: Single value
- **WHEN** `fc.integer(5, 5)` is called (min === max)
- **THEN** a constant arbitrary SHALL be returned

### Requirement: Real Arbitrary

The system SHALL provide a `real(min?, max?)` function that creates an arbitrary generating real numbers within a range.

#### Scenario: Generate bounded reals
- **WHEN** `fc.real(-1.0, 1.0)` is called
- **THEN** all generated values SHALL be real numbers in [-1.0, 1.0]

#### Scenario: Invalid range returns InvalidArbitrary
- **WHEN** `fc.real(10.0, 5.0)` is called (min > max)
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"real: min (10) exceeds max (5)"`

### Requirement: Natural Number Arbitrary

The system SHALL provide a `nat(min?, max?)` function that creates an arbitrary generating non-negative integers.

#### Scenario: Generate natural numbers
- **WHEN** `fc.nat()` is called
- **THEN** all generated values SHALL be >= 0

#### Scenario: Negative max returns InvalidArbitrary
- **WHEN** `fc.nat(0, -5)` is called
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"nat: max (-5) must be non-negative"`

#### Scenario: Negative min clamped
- **WHEN** `fc.nat(-10, 100)` is called
- **THEN** the min SHALL be clamped to 0, generating naturals in [0, 100]

### Requirement: Array Arbitrary

The system SHALL provide an `array(arbitrary, min?, max?)` function that creates arrays of generated values.

#### Scenario: Generate bounded arrays
- **WHEN** `fc.array(fc.integer(), 1, 5)` is called
- **THEN** arrays of 1-5 integers are generated

#### Scenario: Invalid range returns InvalidArbitrary
- **WHEN** `fc.array(fc.integer(), 5, 1)` is called (min > max)
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"array: minLength (5) exceeds maxLength (1)"`

#### Scenario: Negative min returns InvalidArbitrary
- **WHEN** `fc.array(fc.integer(), -1, 5)` is called
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"array: minLength (-1) must be non-negative"`

### Requirement: Set Arbitrary

The system SHALL provide a `set(elements, min?, max?)` function that creates subsets of the given elements.

#### Scenario: Generate subsets
- **WHEN** `fc.set([1, 2, 3, 4, 5], 2, 3)` is called
- **THEN** arrays of 2-3 unique elements from the input are generated

#### Scenario: Invalid range returns InvalidArbitrary
- **WHEN** `fc.set([1, 2, 3], 5, 1)` is called (min > max)
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"set: min (5) exceeds max (1)"`

#### Scenario: Min exceeds elements returns InvalidArbitrary
- **WHEN** `fc.set([1, 2], 5, 10)` is called (min > elements.length)
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"set: min (5) exceeds available elements (2)"`

### Requirement: OneOf Combinator

The system SHALL provide an `oneof(elements)` function that generates one of the given values.

#### Scenario: Generate from set
- **WHEN** `fc.oneof(['a', 'b', 'c'])` is called
- **THEN** one of 'a', 'b', or 'c' is generated each time

#### Scenario: Empty array returns InvalidArbitrary
- **WHEN** `fc.oneof([])` is called
- **THEN** `InvalidArbitrary` SHALL be returned with reason `"oneof: elements array is empty"`

### Requirement: FluentCheck Runner

The system SHALL detect and report `InvalidArbitrary` during property evaluation.

#### Scenario: InvalidArbitrary in property
- **WHEN** a property uses an `InvalidArbitrary`
- **THEN** the property result SHALL have status `'invalid'`
- **AND** the result SHALL include the reason from `InvalidArbitrary`

#### Scenario: InvalidArbitrary in composed arbitrary
- **WHEN** a property uses a composed arbitrary (tuple, chain) containing `InvalidArbitrary`
- **THEN** the property result SHALL have status `'invalid'`

#### Scenario: Reporter output
- **WHEN** a property result has status `'invalid'`
- **THEN** the reporter SHALL display the configuration error
- **AND** the reporter SHALL distinguish invalid results from failures
