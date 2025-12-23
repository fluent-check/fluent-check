## ADDED Requirements

### Requirement: Exact Size Arbitrary Interface

The system SHALL provide an `ExactSizeArbitrary<A>` interface that extends `Arbitrary<A>` with a more specific `size()` return type.

#### Scenario: Interface extends Arbitrary
- **WHEN** an `ExactSizeArbitrary<A>` is used
- **THEN** it SHALL be assignable to `Arbitrary<A>`
- **AND** code expecting `Arbitrary<A>` SHALL accept `ExactSizeArbitrary<A>`

#### Scenario: Specific size return type
- **WHEN** `size()` is called on an `ExactSizeArbitrary<A>`
- **THEN** the return type SHALL be `ExactSize` (not `ArbitrarySize`)
- **AND** no type narrowing SHALL be required to access `ExactSize` fields

### Requirement: Estimated Size Arbitrary Interface

The system SHALL provide an `EstimatedSizeArbitrary<A>` interface that extends `Arbitrary<A>` with a more specific `size()` return type.

#### Scenario: Interface extends Arbitrary
- **WHEN** an `EstimatedSizeArbitrary<A>` is used
- **THEN** it SHALL be assignable to `Arbitrary<A>`
- **AND** code expecting `Arbitrary<A>` SHALL accept `EstimatedSizeArbitrary<A>`

#### Scenario: Specific size return type
- **WHEN** `size()` is called on an `EstimatedSizeArbitrary<A>`
- **THEN** the return type SHALL be `EstimatedSize` (not `ArbitrarySize`)
- **AND** the `credibleInterval` field SHALL be directly accessible

## MODIFIED Requirements

### Requirement: Integer Arbitrary

The system SHALL provide an `integer(min?, max?)` function that creates an arbitrary generating integers within a range.

#### Scenario: Generate bounded integers
- **WHEN** `fc.integer(0, 100)` is called
- **THEN** all generated values SHALL be integers in [0, 100]

#### Scenario: Default bounds
- **WHEN** `fc.integer()` is called without arguments
- **THEN** the range defaults to [MIN_SAFE_INTEGER, MAX_SAFE_INTEGER]

#### Scenario: Empty range
- **WHEN** `fc.integer(10, 5)` is called (min > max)
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Single value
- **WHEN** `fc.integer(5, 5)` is called (min === max)
- **THEN** a constant arbitrary SHALL be returned

#### Scenario: Return type precision
- **WHEN** `fc.integer()` is called
- **THEN** the return type SHALL be `ExactSizeArbitrary<number>`
- **AND** calling `.size()` on the result SHALL return `ExactSize`

### Requirement: Filter Transformation

The system SHALL provide a `filter(predicate)` method to constrain generated values.

#### Scenario: Filter values
- **WHEN** `fc.integer().filter(n => n % 2 === 0)` is called
- **THEN** only even numbers are generated

#### Scenario: Corner cases filtered
- **WHEN** a filter is applied
- **THEN** corner cases that don't pass the filter SHALL be excluded

#### Scenario: Return type is estimated
- **WHEN** `filter()` is called on any arbitrary
- **THEN** the return type SHALL be `EstimatedSizeArbitrary<A>`
- **AND** calling `.size()` on the result SHALL return `EstimatedSize`

### Requirement: Map Transformation

The system SHALL provide a `map(f, shrinkHelper?)` method to transform generated values.

#### Scenario: Transform values
- **WHEN** `fc.integer().map(n => n * 2)` is called
- **THEN** all generated values are doubled

#### Scenario: Inverse map for shrinking
- **WHEN** `map(f, {inverseMap: f'})` is provided
- **THEN** shrinking can work backwards through the transformation

#### Scenario: Preserve size type
- **WHEN** `map()` is called on an `ExactSizeArbitrary<A>`
- **THEN** the return type SHALL be `ExactSizeArbitrary<B>`
- **AND** when called on `EstimatedSizeArbitrary<A>`, it SHALL return `EstimatedSizeArbitrary<B>`
