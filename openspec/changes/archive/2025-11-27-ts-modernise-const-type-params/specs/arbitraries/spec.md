# Arbitraries

## MODIFIED Requirements

### Requirement: OneOf Combinator

The system SHALL provide an `oneof(elements)` function that generates one of the given values, preserving literal types when called with literal arrays.

#### Scenario: Generate from set
- **WHEN** `fc.oneof(['a', 'b', 'c'])` is called
- **THEN** one of 'a', 'b', or 'c' is generated each time

#### Scenario: Empty array
- **WHEN** `fc.oneof([])` is called
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Literal type preservation
- **WHEN** `fc.oneof(['pending', 'active', 'done'])` is called with literal values
- **THEN** the inferred type SHALL be `Arbitrary<'pending' | 'active' | 'done'>`
- **AND** exhaustive switch statements on generated values SHALL be type-safe

### Requirement: Set Arbitrary

The system SHALL provide a `set(elements, min?, max?)` function that creates subsets of the given elements, preserving literal types when called with literal arrays.

#### Scenario: Generate subsets
- **WHEN** `fc.set([1, 2, 3, 4, 5], 2, 3)` is called
- **THEN** arrays of 2-3 unique elements from the input are generated

#### Scenario: Literal type preservation
- **WHEN** `fc.set(['red', 'green', 'blue'], 1, 2)` is called with literal values
- **THEN** the inferred type SHALL be `Arbitrary<('red' | 'green' | 'blue')[]>`

### Requirement: Tuple Arbitrary

The system SHALL provide a `tuple(...arbitraries)` function that creates tuples of generated values with strict tuple type inference.

#### Scenario: Generate typed tuples
- **WHEN** `fc.tuple(fc.integer(), fc.string(), fc.boolean())` is called
- **THEN** tuples of type `[number, string, boolean]` are generated

#### Scenario: Strict tuple inference
- **WHEN** arbitrary combinators are composed with `tuple()`
- **THEN** TypeScript SHALL infer exact tuple types in all contexts
