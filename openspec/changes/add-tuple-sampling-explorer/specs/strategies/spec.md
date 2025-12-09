## ADDED Requirements

### Requirement: Tuple Sampling Explorer

The system SHALL provide a `TupleSamplingExplorer` that samples test cases as tuples from the cartesian product.

#### Scenario: Flat iteration complexity
- **WHEN** exploring a scenario with N forall quantifiers
- **THEN** the number of property evaluations SHALL be O(budget)
- **AND** it SHALL NOT grow exponentially with quantifier count

#### Scenario: Build tuple arbitrary
- **WHEN** exploring a scenario
- **THEN** all quantifier arbitraries SHALL be combined into a single tuple arbitrary
- **AND** samples SHALL be drawn from this combined arbitrary

#### Scenario: Convert to named test cases
- **WHEN** a tuple is sampled
- **THEN** it SHALL be converted to a record with quantifier names as keys

#### Scenario: Reject exists quantifiers
- **WHEN** a scenario contains `exists` quantifiers
- **THEN** TupleSamplingExplorer SHALL throw an error
- **AND** the error SHALL explain that nested exploration is required for existential semantics

#### Scenario: Handle given predicates
- **WHEN** a scenario contains `given` predicates
- **THEN** test cases not satisfying the predicate SHALL be skipped

### Requirement: Tuple Exploration Configuration

The system SHALL allow configuring tuple sampling exploration.

#### Scenario: Enable via factory
- **WHEN** `factory.withTupleExploration()` is called
- **THEN** the resulting checker SHALL use TupleSamplingExplorer

### Requirement: Holistic Strategy Preset

The system SHALL provide a `holistic` preset optimized for multi-quantifier properties.

#### Scenario: Holistic preset configuration
- **WHEN** `fc.strategies.holistic` is used
- **THEN** it SHALL use TupleSamplingExplorer
- **AND** it SHALL include bias toward corner cases
- **AND** it SHALL include deduplication

#### Scenario: Holistic preset usage
- **WHEN** a scenario with 5+ forall quantifiers uses the holistic preset
- **THEN** it SHALL complete within the budget
- **AND** execution time SHALL NOT grow exponentially
