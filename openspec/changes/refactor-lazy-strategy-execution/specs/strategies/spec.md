## MODIFIED Requirements

### Requirement: Strategy Factory

#### Scenario: Build strategy lazily at check time
- **GIVEN** a FluentCheck scenario configured with a `FluentStrategyFactory`
- **WHEN** `.check()` (or `.assert()`) is called on the scenario
- **THEN** a `FluentStrategy` instance SHALL be built from the configured factory at execution time
- **AND** that instance SHALL be reused for the entire scenario execution

### Requirement: Strategy Interface

#### Scenario: Register arbitraries before execution
- **GIVEN** a FluentCheck scenario with one or more quantifiers (`forall` / `exists`)
- **WHEN** `.check()` (or `.assert()`) is called on the scenario
- **THEN** each quantifier SHALL register its arbitrary with the `FluentStrategy` before any inputs are drawn via `hasInput` / `getInput`

