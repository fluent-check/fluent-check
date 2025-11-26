# Shrinking

## Purpose

Finding minimal counterexamples when properties fail by systematically reducing failing inputs.

## Requirements

### Requirement: Shrink Method

The system SHALL provide a `shrink(initial)` method on arbitraries that returns a new arbitrary with simpler values to test.

#### Scenario: Shrink integer
- **WHEN** `fc.integer(0, 100).shrink({value: 50})` is called
- **THEN** an arbitrary generating values smaller than 50 is returned
- **AND** the values tend toward 0 or boundary values

#### Scenario: Shrink to empty
- **WHEN** shrinking exhausts all simpler values
- **THEN** `NoArbitrary` SHALL be returned

### Requirement: Automatic Shrinking on Failure

The system SHALL automatically attempt to shrink counterexamples when a property fails.

#### Scenario: Find minimal counterexample
- **WHEN** a property fails with a complex counterexample
- **THEN** the system SHALL iteratively shrink to find a simpler failing case
- **AND** the final counterexample in the result is the minimal found

### Requirement: Shrinking Through Transformations

The system SHALL support shrinking through `map` and `filter` transformations.

#### Scenario: Shrink mapped arbitrary
- **WHEN** a mapped arbitrary like `fc.integer().map(n => n * 2)` is shrunk
- **THEN** shrinking occurs on the underlying integer
- **AND** results are transformed through the map function

#### Scenario: Shrink filtered arbitrary
- **WHEN** a filtered arbitrary is shrunk
- **THEN** shrunk values that don't pass the filter are excluded

### Requirement: Tuple Shrinking

The system SHALL shrink tuple components independently.

#### Scenario: Shrink tuple
- **WHEN** a tuple [50, "hello", true] fails a property
- **THEN** each component is shrunk independently
- **AND** combinations of shrunk components are tested

### Requirement: Array Shrinking

The system SHALL shrink arrays by reducing both length and element values.

#### Scenario: Shrink array length
- **WHEN** an array [1, 2, 3, 4, 5] fails a property
- **THEN** shorter arrays are tried

#### Scenario: Shrink array elements
- **WHEN** an array fails a property
- **THEN** element values are also shrunk toward simpler values

### Requirement: Regex String Shrinking

The system SHALL provide `shrinkRegexString(s, pattern)` for shrinking strings while maintaining pattern validity.

#### Scenario: Remove characters
- **WHEN** shrinking a regex-matched string
- **THEN** characters are removed while maintaining pattern match

#### Scenario: Simplify repeated characters
- **WHEN** shrinking a string with repeated characters
- **THEN** repetitions are reduced while maintaining pattern match

#### Scenario: Simplify character choices
- **WHEN** shrinking a string
- **THEN** digits are simplified toward 0
- **AND** the pattern match is maintained

### Requirement: Configurable Shrink Size

The system SHALL allow configuration of how many shrink attempts to make.

#### Scenario: Configure shrink iterations
- **WHEN** `.withShrinking(1000)` is called on the strategy
- **THEN** up to 1000 shrink candidates are tested

#### Scenario: Default shrink size
- **WHEN** shrinking is enabled without configuration
- **THEN** 500 shrink candidates are tested by default
