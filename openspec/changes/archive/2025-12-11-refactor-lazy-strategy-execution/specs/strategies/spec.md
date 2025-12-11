## MODIFIED Requirements

### Requirement: Strategy Factory

The system SHALL provide a `FluentStrategyFactory` for building customized test strategies using a fluent API.

#### Scenario: Create factory
- **WHEN** `fc.strategy()` is called
- **THEN** a new FluentStrategyFactory instance is returned

#### Scenario: Build strategy
- **WHEN** `.build()` is called on the factory
- **THEN** a configured FluentStrategy instance is returned

#### Scenario: Build strategy lazily at check time
- **GIVEN** a FluentCheck scenario configured with a `FluentStrategyFactory`
- **WHEN** `.check()` (or `.assert()`) is called on the scenario
- **THEN** a `FluentStrategy` instance SHALL be built from the configured factory at execution time
- **AND** that instance SHALL be reused for the entire scenario execution

### Requirement: Strategy Interface

The system SHALL define a `FluentStrategyInterface` with core methods for test execution.

#### Scenario: hasInput method
- **WHEN** `hasInput(arbitraryName)` is called
- **THEN** it returns whether more test inputs are available for that arbitrary

#### Scenario: getInput method
- **WHEN** `getInput(arbitraryName)` is called
- **THEN** it returns the next test input for that arbitrary

#### Scenario: handleResult method
- **WHEN** `handleResult()` is called
- **THEN** it marks the end of one test iteration

#### Scenario: Register arbitraries before execution
- **GIVEN** a FluentCheck scenario with one or more quantifiers (`forall` / `exists`)
- **WHEN** `.check()` (or `.assert()`) is called on the scenario
- **THEN** each quantifier SHALL register its arbitrary with the `FluentStrategy` before any inputs are drawn via `hasInput` / `getInput`

