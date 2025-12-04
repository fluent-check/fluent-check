## ADDED Requirements

### Requirement: Preserve Original Types in Fluent Picks

The system SHALL track both the generated value type and the original source type for picks produced by arbitraries.

#### Scenario: Base arbitraries preserve original type
- **GIVEN** a base arbitrary `Arbitrary<A>`
- **WHEN** `pick()` is called
- **THEN** the returned `FluentPick` SHALL have `value: A`
- **AND** `original` SHALL have type `A` (or a compatible structure composed of `A`)

#### Scenario: Mapped arbitraries record source type
- **GIVEN** a mapped arbitrary created with `arb.map(f)` where `arb: Arbitrary<A>` and `f: (a: A) => B`
- **WHEN** `pick()` is called on the mapped arbitrary
- **THEN** the returned `FluentPick` SHALL have `value: B`
- **AND** `original` SHALL have type `A`, representing the pre-mapped source

#### Scenario: Shrinking uses original type consistently
- **GIVEN** a mapped arbitrary as above
- **AND** a `FluentPick<B, A>` that falsifies a property
- **WHEN** `shrink(pick)` is called
- **THEN** the resulting arbitrary SHALL be able to use the `original` value of type `A` in its shrinking logic
- **AND** the type system SHALL reflect this relationship

