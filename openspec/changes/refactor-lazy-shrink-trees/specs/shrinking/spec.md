# Shrinking Specification

## MODIFIED Requirements

### Requirement: Shrink Method Signature

The `shrink()` method on `Arbitrary<A>` SHALL return a `Generator<FluentPick<A>>` that lazily produces progressively smaller counterexample candidates.

#### Scenario: Shrink returns a generator

- **GIVEN** an arbitrary with a failing counterexample
- **WHEN** `shrink(counterexample)` is called
- **THEN** a Generator is returned
- **AND** the generator yields `FluentPick<A>` values on demand
- **AND** candidates are computed lazily (not eagerly materialized)

#### Scenario: Empty shrink for non-shrinkable values

- **GIVEN** an arbitrary value that cannot be shrunk further (e.g., 0 for positive integers)
- **WHEN** `shrink(minimalValue)` is called
- **THEN** the generator yields no values (immediately done)

#### Scenario: Generator exhaustion

- **GIVEN** a shrink generator that has yielded all candidates
- **WHEN** `next()` is called on the exhausted generator
- **THEN** `{ done: true, value: undefined }` is returned

### Requirement: Shrink Composition for Composite Types

Composite arbitraries (tuples, records, arrays) SHALL compose element shrink generators using interleaved iteration.

#### Scenario: Tuple shrinking interleaves element positions

- **GIVEN** a tuple arbitrary `tuple(integer(), string())`
- **AND** a counterexample `[10, "hello"]`
- **WHEN** `shrink([10, "hello"])` is called
- **THEN** the generator interleaves candidates from each position
- **AND** early candidates include shrinks of the first element
- **AND** early candidates also include shrinks of the second element

#### Scenario: Array shrinking combines length and element shrinks

- **GIVEN** an array arbitrary `array(integer(), 1, 5)`
- **AND** a counterexample `[10, 20, 30]`
- **WHEN** `shrink([10, 20, 30])` is called
- **THEN** candidates include shorter arrays (length shrinking)
- **AND** candidates include arrays with smaller elements (element shrinking)
- **AND** length shrinks are prioritized (smaller arrays first)

### Requirement: Binary Search Shrinking for Numeric Types

Numeric arbitraries SHALL shrink using binary search toward a target value (typically 0).

#### Scenario: Integer shrinks via binary search toward zero

- **GIVEN** an integer arbitrary
- **AND** a counterexample value of 100
- **WHEN** `shrink({value: 100, original: 100})` is called
- **THEN** candidates are yielded in binary search order: 0, 50, 75, 87, 93, 96, 98, 99
- **AND** the number of candidates is O(log n)

#### Scenario: Negative integer shrinks toward zero

- **GIVEN** an integer arbitrary
- **AND** a counterexample value of -100
- **WHEN** `shrink({value: -100, original: -100})` is called
- **THEN** candidates are yielded approaching zero from below: 0, -50, -75, ...

## ADDED Requirements

### Requirement: Shrink Generator Utilities

The system SHALL provide utility functions for composing and manipulating shrink generators.

#### Scenario: Interleave multiple generators

- **GIVEN** two shrink generators `g1` and `g2`
- **WHEN** `interleave(g1, g2)` is called
- **THEN** a new generator is returned that alternates values from g1 and g2
- **AND** continues until both are exhausted

#### Scenario: Take limited candidates from generator

- **GIVEN** a shrink generator with many candidates
- **WHEN** `take(generator, 10)` is called
- **THEN** a new generator is returned that yields at most 10 values

### Requirement: Backward Compatibility Adapter

The system SHALL provide a method to convert shrink generators back to arbitraries for legacy compatibility.

#### Scenario: Convert generator to arbitrary

- **GIVEN** a shrink generator
- **WHEN** `shrinkToArbitrary(counterexample)` is called
- **THEN** an `Arbitrary<A>` is returned
- **AND** the arbitrary's `pick()` returns values from the generator
- **AND** the arbitrary's `sample(n)` returns up to n values from the generator

### Requirement: Strategy Lazy Consumption

The shrinking strategy SHALL consume shrink generators lazily, pulling candidates only as needed.

#### Scenario: On-demand shrink candidate retrieval

- **GIVEN** a strategy with shrinking enabled
- **AND** a failing counterexample
- **WHEN** shrinking begins
- **THEN** candidates are pulled from the generator one at a time
- **AND** pulling stops when a smaller failing case is found
- **AND** unused candidates are never computed

#### Scenario: Shrink iteration limit

- **GIVEN** a strategy with `shrinkSize` configuration
- **WHEN** shrinking a counterexample
- **THEN** at most `shrinkSize` candidates are tested per shrink depth
- **AND** the generator may have more candidates that are not consumed
