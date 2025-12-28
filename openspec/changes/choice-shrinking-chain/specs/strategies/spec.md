## NEW Requirements

### Requirement: Choice Shrinker

The system SHALL provide a `ChoiceShrinker<Rec>` for shrinking using choice sequences.

#### Scenario: Shrink method signature
- **WHEN** a ChoiceShrinker is used
- **THEN** it SHALL accept a counterexample, choice streams map, scenario, property, and budget
- **AND** it SHALL return a ShrinkResult

#### Scenario: Shrink via choice replay
- **WHEN** shrinking a counterexample
- **THEN** the shrinker SHALL generate candidate choice sequences
- **AND** it SHALL replay the generator with each candidate
- **AND** it SHALL accept candidates that still fail the property

#### Scenario: Choice shrinker preserves constraints
- **WHEN** shrinking a dependent generator value
- **THEN** all shrunk values satisfy the generator's constraints
- **AND** invalid values are never produced (by definition of replay)

### Requirement: Choice Shrinking Configuration

The system SHALL allow configuring choice shrinking via the strategy factory.

#### Scenario: Enable choice shrinking
- **WHEN** `factory.withChoiceShrinking()` is called
- **THEN** the resulting strategy SHALL use choice shrinking for all arbitraries

#### Scenario: Auto-detect choice shrinking
- **WHEN** a scenario contains `.chain()` arbitraries
- **THEN** the strategy MAY automatically enable choice shrinking for those arbitraries
- **AND** other arbitraries may still use value shrinking

#### Scenario: Hybrid shrinking
- **WHEN** a scenario contains both simple and chained arbitraries
- **THEN** the strategy SHALL use appropriate shrinking for each
- **AND** value shrinking for simple arbitraries (faster)
- **AND** choice shrinking for chained arbitraries (correct)

## MODIFIED Requirements

### Requirement: Strategy Factory

The system SHALL provide a `FluentStrategyFactory` for building customized test strategies including choice shrinking.

#### Scenario: Create factory
- **WHEN** `fc.strategy()` is called
- **THEN** a new FluentStrategyFactory instance is returned

#### Scenario: Build strategy with choice shrinking
- **WHEN** `.withChoiceShrinking().build()` is called on the factory
- **THEN** a strategy with choice shrinking enabled is returned

### Requirement: Shrinker Configuration

The system SHALL allow configuring which Shrinker implementation to use, including choice shrinking.

#### Scenario: Enable shrinking
- **WHEN** `factory.withShrinking()` is called
- **THEN** the resulting checker SHALL use PerArbitraryShrinker by default

#### Scenario: Enable choice shrinking
- **WHEN** `factory.withShrinking().withChoiceShrinking()` is called
- **THEN** the resulting checker SHALL use ChoiceShrinker

#### Scenario: Auto choice shrinking
- **WHEN** `factory.withShrinking({ auto: true })` is called
- **THEN** the checker SHALL automatically select the appropriate shrinker
- **AND** ChoiceShrinker for scenarios with `.chain()`
- **AND** PerArbitraryShrinker otherwise
