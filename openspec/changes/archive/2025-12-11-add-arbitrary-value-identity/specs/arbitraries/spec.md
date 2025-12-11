## ADDED Requirements

### Requirement: Value Identity Functions

The system SHALL provide `hashCode()` and `equals()` methods on `Arbitrary<A>` for efficient value identity operations.

#### Scenario: hashCode returns a hash function

- **WHEN** `arbitrary.hashCode()` is called
- **THEN** it SHALL return a function `(a: A) => number`
- **AND** the function SHALL return consistent values for equal inputs
- **AND** the function SHALL return a 32-bit integer

#### Scenario: equals returns an equality function

- **WHEN** `arbitrary.equals()` is called
- **THEN** it SHALL return a function `(a: A, b: A) => boolean`
- **AND** the function SHALL be reflexive (`equals(a, a) === true`)
- **AND** the function SHALL be symmetric (`equals(a, b) === equals(b, a)`)
- **AND** the function SHALL be transitive

#### Scenario: Default fallback uses stringify

- **WHEN** an Arbitrary does not override `hashCode()` or `equals()`
- **THEN** the default implementation SHALL use `JSON.stringify` for comparison
- **AND** existing deduplication behavior SHALL be preserved

#### Scenario: Primitive arbitraries use efficient identity

- **WHEN** `integer()`, `real()`, or `boolean()` arbitraries provide identity functions
- **THEN** they SHALL NOT use `JSON.stringify`
- **AND** `ArbitraryInteger` SHALL use identity hash (`v | 0`)
- **AND** `ArbitraryReal` SHALL use `Object.is` for equals (handling NaN and -0)
- **AND** `ArbitraryBoolean` SHALL use trivial `0`/`1` hash

#### Scenario: Composite arbitraries compose identity

- **WHEN** `array()`, `tuple()`, or `record()` arbitraries provide identity functions
- **THEN** they SHALL compose hash/equals from their element arbitraries
- **AND** hash mixing SHALL prevent trivial collisions (e.g., `[1,2]` vs `[2,1]`)

## MODIFIED Requirements

### Requirement: Sampling Methods

The system SHALL provide multiple sampling methods for generating test cases.

#### Scenario: sample method

- **WHEN** `arbitrary.sample(10)` is called
- **THEN** 10 picks are returned (may contain duplicates)

#### Scenario: sampleUnique method

- **WHEN** `arbitrary.sampleUnique(10)` is called
- **THEN** up to 10 unique picks are returned
- **AND** deduplication SHALL use the arbitrary's `hashCode()` and `equals()` functions

#### Scenario: sampleWithBias method

- **WHEN** `arbitrary.sampleWithBias(10)` is called
- **THEN** corner cases are included at the start of the sample

#### Scenario: sampleUniqueWithBias method

- **WHEN** `arbitrary.sampleUniqueWithBias(10)` is called
- **THEN** unique picks with corner case bias are returned
