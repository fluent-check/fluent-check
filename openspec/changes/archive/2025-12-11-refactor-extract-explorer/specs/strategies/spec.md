## ADDED Requirements

### Requirement: Explorer Interface

The system SHALL provide an `Explorer<Rec>` interface for navigating the search space of a scenario.

#### Scenario: Explore method signature
- **WHEN** an Explorer is used
- **THEN** it SHALL accept a scenario, property function, sampler, and budget
- **AND** it SHALL return an ExplorationResult

#### Scenario: Explorer is stateless
- **WHEN** an Explorer explores a scenario
- **THEN** the Explorer instance SHALL NOT retain state between explorations

### Requirement: Exploration Budget

The system SHALL provide an `ExplorationBudget` type for controlling exploration limits.

#### Scenario: Max tests budget
- **WHEN** `budget.maxTests` is set to N
- **THEN** the explorer SHALL evaluate the property at most N times

#### Scenario: Optional time budget
- **WHEN** `budget.maxTime` is set
- **THEN** the explorer MAY stop early if time is exceeded

### Requirement: Exploration Result

The system SHALL provide an `ExplorationResult<Rec>` type representing exploration outcomes.

#### Scenario: Passed result
- **WHEN** all tested cases satisfy the property
- **THEN** the result SHALL have `outcome: 'passed'` and `testsRun` count

#### Scenario: Failed result
- **WHEN** a counterexample is found
- **THEN** the result SHALL have `outcome: 'failed'`, `counterexample`, and `testsRun` count

#### Scenario: Exhausted result
- **WHEN** the budget is exhausted before finding failure
- **THEN** the result SHALL have `outcome: 'exhausted'` and `testsRun` count

### Requirement: Nested Loop Explorer

The system SHALL provide a `NestedLoopExplorer` that implements current behavior.

#### Scenario: Forall semantics
- **WHEN** exploring a scenario with only `forall` quantifiers
- **THEN** it SHALL iterate nested loops over all quantifier samples
- **AND** it SHALL fail on the first counterexample found

#### Scenario: Exists semantics
- **WHEN** exploring a scenario with `exists` quantifiers
- **THEN** it SHALL search for a witness that satisfies the property
- **AND** it SHALL succeed when a witness is found

#### Scenario: Given predicate
- **WHEN** a `given` predicate is in the scenario
- **THEN** test cases not satisfying the predicate SHALL be skipped

### Requirement: Explorer Configuration

The system SHALL allow configuring which Explorer implementation to use.

#### Scenario: Configure via factory
- **WHEN** `factory.withNestedExploration()` is called
- **THEN** the resulting checker SHALL use NestedLoopExplorer

#### Scenario: Default explorer
- **WHEN** no explorer is explicitly configured
- **THEN** NestedLoopExplorer SHALL be used by default
