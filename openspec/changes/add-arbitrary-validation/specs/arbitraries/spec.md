# Arbitraries Delta

## MODIFIED Requirements

### Requirement: Integer Arbitrary

The system SHALL provide an `integer(min?, max?, options?)` function that creates an arbitrary generating integers within a range.

#### Scenario: Generate bounded integers
- **WHEN** `fc.integer(0, 100)` is called
- **THEN** all generated values SHALL be integers in [0, 100]

#### Scenario: Default bounds
- **WHEN** `fc.integer()` is called without arguments
- **THEN** the range defaults to [MIN_SAFE_INTEGER, MAX_SAFE_INTEGER]

#### Scenario: Invalid range throws
- **WHEN** `fc.integer(10, 5)` is called (min > max)
- **THEN** a RangeError SHALL be thrown with message indicating invalid range

#### Scenario: Invalid range with unsafe option
- **WHEN** `fc.integer(10, 5, { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Single value
- **WHEN** `fc.integer(5, 5)` is called (min === max)
- **THEN** a constant arbitrary SHALL be returned

### Requirement: Real Arbitrary

The system SHALL provide a `real(min?, max?, options?)` function that creates an arbitrary generating real numbers within a range.

#### Scenario: Generate bounded reals
- **WHEN** `fc.real(-1.0, 1.0)` is called
- **THEN** all generated values SHALL be real numbers in [-1.0, 1.0]

#### Scenario: Invalid range throws
- **WHEN** `fc.real(10.0, 5.0)` is called (min > max)
- **THEN** a RangeError SHALL be thrown with message indicating invalid range

#### Scenario: Invalid range with unsafe option
- **WHEN** `fc.real(10.0, 5.0, { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

### Requirement: Natural Number Arbitrary

The system SHALL provide a `nat(min?, max?, options?)` function that creates an arbitrary generating non-negative integers.

#### Scenario: Generate natural numbers
- **WHEN** `fc.nat()` is called
- **THEN** all generated values SHALL be >= 0

#### Scenario: Negative max throws
- **WHEN** `fc.nat(0, -5)` is called
- **THEN** a RangeError SHALL be thrown with message indicating invalid range

#### Scenario: Negative max with unsafe option
- **WHEN** `fc.nat(0, -5, { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Negative min clamped
- **WHEN** `fc.nat(-10, 100)` is called
- **THEN** the min SHALL be clamped to 0, generating naturals in [0, 100]

### Requirement: Array Arbitrary

The system SHALL provide an `array(arbitrary, min?, max?, options?)` function that creates arrays of generated values.

#### Scenario: Generate bounded arrays
- **WHEN** `fc.array(fc.integer(), 1, 5)` is called
- **THEN** arrays of 1-5 integers are generated

#### Scenario: Invalid range throws
- **WHEN** `fc.array(fc.integer(), 5, 1)` is called (min > max)
- **THEN** a RangeError SHALL be thrown with message indicating invalid range

#### Scenario: Negative min throws
- **WHEN** `fc.array(fc.integer(), -1, 5)` is called
- **THEN** a RangeError SHALL be thrown with message indicating invalid bounds

#### Scenario: Invalid range with unsafe option
- **WHEN** `fc.array(fc.integer(), 5, 1, { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

### Requirement: Set Arbitrary

The system SHALL provide a `set(elements, min?, max?, options?)` function that creates subsets of the given elements.

#### Scenario: Generate subsets
- **WHEN** `fc.set([1, 2, 3, 4, 5], 2, 3)` is called
- **THEN** arrays of 2-3 unique elements from the input are generated

#### Scenario: Invalid range throws
- **WHEN** `fc.set([1, 2, 3], 5, 1)` is called (min > max)
- **THEN** a RangeError SHALL be thrown with message indicating invalid range

#### Scenario: Min exceeds elements throws
- **WHEN** `fc.set([1, 2], 5, 10)` is called (min > elements.length)
- **THEN** a RangeError SHALL be thrown with message indicating min exceeds available elements

#### Scenario: Invalid bounds with unsafe option
- **WHEN** `fc.set([1, 2, 3], 5, 1, { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

### Requirement: OneOf Combinator

The system SHALL provide an `oneof(elements, options?)` function that generates one of the given values.

#### Scenario: Generate from set
- **WHEN** `fc.oneof(['a', 'b', 'c'])` is called
- **THEN** one of 'a', 'b', or 'c' is generated each time

#### Scenario: Empty array throws
- **WHEN** `fc.oneof([])` is called
- **THEN** a RangeError SHALL be thrown with message indicating empty elements array

#### Scenario: Empty array with unsafe option
- **WHEN** `fc.oneof([], { unsafe: true })` is called
- **THEN** NoArbitrary SHALL be returned

## ADDED Requirements

### Requirement: Arbitrary Options

The system SHALL support an options parameter for arbitrary factory functions to control validation behavior.

#### Scenario: Unsafe option type
- **WHEN** an arbitrary factory is called with `{ unsafe: true }`
- **THEN** invalid inputs SHALL return NoArbitrary instead of throwing

#### Scenario: Default behavior is safe
- **WHEN** an arbitrary factory is called without options or with `{ unsafe: false }`
- **THEN** invalid inputs SHALL throw RangeError

#### Scenario: Shrinking uses unsafe mode
- **WHEN** an arbitrary's `shrink()` method calls factory functions internally
- **THEN** it SHALL use `{ unsafe: true }` to prevent exceptions during shrinking
