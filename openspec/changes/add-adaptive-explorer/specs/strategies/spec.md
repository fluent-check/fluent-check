## ADDED Requirements

### Requirement: Adaptive Explorer

The system SHALL provide an `AdaptiveExplorer` that automatically selects the best exploration strategy.

#### Scenario: Select nested for exists
- **WHEN** a scenario contains `exists` quantifiers
- **THEN** AdaptiveExplorer SHALL delegate to NestedLoopExplorer

#### Scenario: Select tuple for many foralls
- **WHEN** a scenario has 4 or more pure `forall` quantifiers
- **THEN** AdaptiveExplorer SHALL delegate to TupleSamplingExplorer

#### Scenario: Select nested for few foralls
- **WHEN** a scenario has fewer than 4 pure `forall` quantifiers
- **THEN** AdaptiveExplorer SHALL delegate to NestedLoopExplorer

#### Scenario: Transparent delegation
- **WHEN** AdaptiveExplorer delegates to another explorer
- **THEN** the result SHALL be identical to calling that explorer directly

### Requirement: Adaptive Heuristic Configuration

The system SHALL allow customizing adaptive selection heuristics.

#### Scenario: Custom quantifier threshold
- **WHEN** `AdaptiveExplorer` is configured with `{ quantifierThreshold: 3 }`
- **THEN** tuple sampling SHALL be used for 3+ pure forall quantifiers

### Requirement: Adaptive Exploration Configuration

The system SHALL allow configuring adaptive exploration.

#### Scenario: Enable via factory
- **WHEN** `factory.withAdaptiveExploration()` is called
- **THEN** the resulting checker SHALL use AdaptiveExplorer

### Requirement: Smart Strategy Preset

The system SHALL provide a `smart` preset that automatically optimizes execution.

#### Scenario: Smart preset configuration
- **WHEN** `fc.strategies.smart` is used
- **THEN** it SHALL use AdaptiveExplorer
- **AND** it SHALL include bias toward corner cases
- **AND** it SHALL include deduplication
- **AND** it SHALL include caching
- **AND** it SHALL include shrinking

#### Scenario: Smart preset adapts to scenario
- **WHEN** a scenario is checked with the smart preset
- **THEN** execution strategy SHALL be chosen based on scenario structure
- **AND** performance SHALL be optimal for that structure
