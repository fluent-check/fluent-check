## MODIFIED Requirements

### Requirement: Arbitrary Base Class

The system SHALL provide a simplified `Arbitrary<A>` base class focused on choice-based generation.

#### Scenario: Primary generation method
- **WHEN** an arbitrary is used for generation
- **THEN** `pickFromChoices(stream)` SHALL be the primary method
- **AND** `pick(generator)` SHALL be a compatibility wrapper

#### Scenario: Deprecated methods
- **WHEN** `shrink()`, `isShrunken()`, or `canGenerate()` are called
- **THEN** they SHALL function for backward compatibility
- **AND** deprecation warnings MAY be logged
- **AND** these methods are no longer required for new arbitraries

#### Scenario: Simplified interface
- **WHEN** implementing a new arbitrary
- **THEN** only `size()` and `pickFromChoices()` are required
- **AND** `cornerCases()` and `equals()` are optional with sensible defaults

### Requirement: FluentPick Simplification

The system SHALL simplify `FluentPick<A>` by removing shrinking metadata.

#### Scenario: Simplified FluentPick
- **WHEN** a value is picked from an arbitrary
- **THEN** `FluentPick` SHALL contain `{ value: A }`
- **AND** `original` and `preMapValue` are no longer required
- **AND** choice sequences contain all shrinking information

#### Scenario: Backward compatibility
- **WHEN** existing code accesses `pick.original` or `pick.preMapValue`
- **THEN** these fields MAY be present for compatibility
- **AND** new code SHOULD NOT rely on them

### Requirement: MappedArbitrary Simplification

The system SHALL simplify `MappedArbitrary` by removing metadata preservation.

#### Scenario: Map without metadata
- **WHEN** `arbitrary.map(f)` creates a MappedArbitrary
- **THEN** `pickFromChoices()` delegates to base and applies `f`
- **AND** no `preMapValue` is stored
- **AND** shrinking operates on choices, not on the mapped value

#### Scenario: Nested maps
- **WHEN** multiple `.map()` calls are chained
- **THEN** each map applies its function during replay
- **AND** no metadata chain is needed
- **AND** shrinking automatically composes through all maps

### Requirement: FilteredArbitrary with Choices

The system SHALL handle filter rejection during choice replay.

#### Scenario: Filter rejection in replay
- **WHEN** replaying choices through a filtered arbitrary
- **AND** the generated value fails the filter
- **THEN** the shrink candidate is rejected
- **AND** the shrinker tries the next candidate

#### Scenario: Filter with adjusted choices
- **WHEN** shrinking a filtered arbitrary
- **THEN** choice candidates that produce filter-passing values are tried
- **AND** rejection rate during shrinking may be high (expected)

## NEW Requirements

### Requirement: Corner Cases from Choices

The system SHALL derive corner cases from choice extremes.

#### Scenario: Integer corner cases
- **WHEN** `fc.integer(0, 100).cornerCases()` is called
- **THEN** corner cases SHALL include values from choice extremes
- **AND** choice 0.0 → min value, choice ~1.0 → max value
- **AND** explicit corner values (0, -1, 1) if in range

#### Scenario: Composite corner cases
- **WHEN** corner cases are requested for composites
- **THEN** they SHALL be derived from component corner choices
- **AND** combinations of extreme choices are included

### Requirement: Equals from Values

The system SHALL derive equality from value comparison only.

#### Scenario: Value equality
- **WHEN** `arbitrary.equals(a, b)` is called
- **THEN** it SHALL compare values, not choices
- **AND** two different choice sequences producing the same value are equal

#### Scenario: Default equality
- **WHEN** an arbitrary doesn't override `equals()`
- **THEN** deep equality SHALL be used by default
- **AND** primitives use `===`, objects use structural comparison
