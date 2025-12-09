## ADDED Requirements

### Requirement: Scenario Data Structure

The system SHALL provide a `Scenario<Rec>` type representing an immutable AST of a property test.

#### Scenario: Scenario contains nodes
- **WHEN** a scenario is built from a FluentCheck chain
- **THEN** it SHALL contain an ordered array of nodes representing quantifiers and predicates

#### Scenario: Scenario is immutable
- **WHEN** a scenario is created
- **THEN** its `nodes` array SHALL be readonly
- **AND** individual nodes SHALL be readonly

### Requirement: Scenario Node Types

The system SHALL support different node types in a scenario.

#### Scenario: Forall node
- **WHEN** a `forall` quantifier is in the chain
- **THEN** the scenario SHALL contain a node with `type: 'forall'`, `name`, and `arbitrary`

#### Scenario: Exists node
- **WHEN** an `exists` quantifier is in the chain
- **THEN** the scenario SHALL contain a node with `type: 'exists'`, `name`, and `arbitrary`

#### Scenario: Given node
- **WHEN** a `given` predicate is in the chain
- **THEN** the scenario SHALL contain a node with `type: 'given'` and `predicate`

#### Scenario: Then node
- **WHEN** a `then` predicate is in the chain
- **THEN** the scenario SHALL contain a node with `type: 'then'` and `predicate`

### Requirement: Scenario Derived Properties

The system SHALL provide computed properties on scenarios for analysis.

#### Scenario: Quantifiers list
- **WHEN** `scenario.quantifiers` is accessed
- **THEN** it SHALL return only the quantifier nodes (forall/exists)

#### Scenario: Existential detection
- **WHEN** `scenario.hasExistential` is accessed
- **THEN** it SHALL return true if any `exists` quantifier is present

#### Scenario: Search space size
- **WHEN** `scenario.searchSpaceSize` is accessed
- **THEN** it SHALL return the product of all quantifier arbitrary sizes

### Requirement: Build Scenario from FluentCheck

The system SHALL provide a method to extract a scenario from a FluentCheck chain.

#### Scenario: Build scenario
- **WHEN** `buildScenario()` is called on a FluentCheck instance
- **THEN** it SHALL return a `Scenario<Rec>` representing the full chain
- **AND** node order SHALL match the chain order (root to leaf)
