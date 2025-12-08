## ADDED Requirements

### Requirement: Shrinker Interface

The system SHALL provide a `Shrinker<Rec>` interface for minimizing counterexamples.

#### Scenario: Shrink method signature
- **WHEN** a Shrinker is used
- **THEN** it SHALL accept a counterexample, scenario, property function, sampler, and budget
- **AND** it SHALL return a ShrinkResult

#### Scenario: Shrinker preserves failure
- **WHEN** a Shrinker shrinks a counterexample
- **THEN** the shrunk value SHALL still fail the property

### Requirement: Shrink Budget

The system SHALL provide a `ShrinkBudget` type for controlling shrinking limits.

#### Scenario: Max attempts budget
- **WHEN** `budget.maxAttempts` is set to N
- **THEN** the shrinker SHALL test at most N shrink candidates

#### Scenario: Max rounds budget
- **WHEN** `budget.maxRounds` is set to R
- **THEN** the shrinker SHALL perform at most R shrink iterations

### Requirement: Shrink Result

The system SHALL provide a `ShrinkResult<Rec>` type representing shrinking outcomes.

#### Scenario: Shrunk value
- **WHEN** shrinking completes
- **THEN** the result SHALL contain the minimized counterexample

#### Scenario: Shrink statistics
- **WHEN** shrinking completes
- **THEN** the result SHALL include `attempts` and `rounds` counts

### Requirement: Per-Arbitrary Shrinker

The system SHALL provide a `PerArbitraryShrinker` that shrinks each quantifier independently.

#### Scenario: Shrink individual arbitraries
- **WHEN** shrinking a counterexample with multiple quantifiers
- **THEN** each quantifier's value SHALL be shrunk independently
- **AND** the property SHALL be re-evaluated to confirm failure

#### Scenario: Use arbitrary shrink method
- **WHEN** shrinking a value
- **THEN** it SHALL use the arbitrary's `shrink()` method to generate candidates

### Requirement: No-Op Shrinker

The system SHALL provide a `NoOpShrinker` that disables shrinking.

#### Scenario: Return unchanged
- **WHEN** NoOpShrinker shrinks a counterexample
- **THEN** it SHALL return the counterexample unchanged
- **AND** attempts and rounds SHALL be 0

### Requirement: Shrinker Configuration

The system SHALL allow configuring which Shrinker implementation to use.

#### Scenario: Enable shrinking
- **WHEN** `factory.withShrinking()` is called
- **THEN** the resulting checker SHALL use PerArbitraryShrinker

#### Scenario: Disable shrinking
- **WHEN** `factory.withoutShrinking()` is called
- **THEN** the resulting checker SHALL use NoOpShrinker

#### Scenario: Configure shrink size
- **WHEN** `factory.withShrinking(1000)` is called
- **THEN** the shrinker budget SHALL have maxAttempts of 1000
