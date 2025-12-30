## MODIFIED Requirements

### Requirement: Shrinking Configuration

The system SHALL allow configuring shrinking mode with choice-based as default.

#### Scenario: Default shrinking
- **WHEN** `factory.withShrinking()` is called
- **THEN** the resulting checker SHALL use `ChoiceShrinker`

#### Scenario: Value shrinking opt-in
- **WHEN** `factory.withShrinking({ mode: 'value' })` is called
- **THEN** the resulting checker SHALL use `PerArbitraryShrinker`
- **AND** a deprecation notice MAY be shown

#### Scenario: Configure shrink budget
- **WHEN** `factory.withShrinking({ budget: 1000 })` is called
- **THEN** the shrinker budget SHALL have maxAttempts of 1000
- **AND** the mode defaults to choice-based

### Requirement: Strategy Presets Update

The system SHALL update strategy presets to use choice shrinking.

#### Scenario: Default strategy preset
- **WHEN** `fc.strategy().defaultStrategy()` is used
- **THEN** it SHALL use choice-based shrinking
- **AND** other settings remain unchanged

#### Scenario: Thorough strategy preset
- **WHEN** `fc.strategies.thorough` is used
- **THEN** it SHALL use choice-based shrinking
- **AND** higher shrink budget for complex cases

#### Scenario: Fast strategy preset
- **WHEN** `fc.strategies.fast` is used
- **THEN** it MAY use choice-based shrinking with lower budget
- **OR** it MAY disable shrinking for speed

### Requirement: Per-Arbitrary Shrinker (Deprecated)

The system SHALL maintain `PerArbitraryShrinker` for backward compatibility.

#### Scenario: Legacy shrinker
- **WHEN** value shrinking mode is explicitly requested
- **THEN** `PerArbitraryShrinker` SHALL be used
- **AND** it functions as before Phase 3

#### Scenario: Deprecation path
- **WHEN** value shrinking is used
- **THEN** a deprecation warning MAY be logged
- **AND** documentation SHALL recommend migration to choice shrinking

## NEW Requirements

### Requirement: Choice Shrinker Optimizations

The system SHALL provide optimized choice shrinking for performance.

#### Scenario: Cached replay
- **WHEN** shrinking tries many choice candidates
- **THEN** replay results MAY be cached for identical prefixes
- **AND** partial replay for prefix matches

#### Scenario: Parallel shrinking
- **WHEN** multiple shrink candidates are tried
- **THEN** the shrinker MAY evaluate candidates in parallel
- **AND** first successful shrink is accepted

#### Scenario: Smart candidate ordering
- **WHEN** generating shrink candidates
- **THEN** candidates more likely to succeed are tried first
- **AND** learning from previous shrink attempts

### Requirement: Shrink Statistics Enhancement

The system SHALL provide detailed statistics for choice shrinking.

#### Scenario: Choice shrink statistics
- **WHEN** shrinking completes
- **THEN** statistics SHALL include:
  - Total choice sequences tried
  - Replay failures (filter rejections, exhausted streams)
  - Successful shrinks by strategy (deletion, zeroing, binary)
  - Choice sequence length reduction

#### Scenario: Performance statistics
- **WHEN** detailed statistics are enabled
- **THEN** timing information SHALL include:
  - Time in replay vs. property evaluation
  - Cache hit rate
  - Candidates per successful shrink

### Requirement: Migration Tooling

The system SHALL provide tools to help migrate from value to choice shrinking.

#### Scenario: Shrink comparison mode
- **WHEN** `factory.withShrinking({ compare: true })` is configured
- **THEN** both value and choice shrinking are run
- **AND** results are compared for quality
- **AND** warnings are logged if value shrinking is better

#### Scenario: Migration report
- **WHEN** running tests with migration analysis enabled
- **THEN** a report identifies arbitraries with custom `shrink()` methods
- **AND** suggests migration steps for each
