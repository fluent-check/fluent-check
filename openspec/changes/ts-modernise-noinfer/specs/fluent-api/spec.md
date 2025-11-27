# Fluent API

## MODIFIED Requirements

### Requirement: Given Clause

The system SHALL provide a `given(name, valueOrFactory)` method for setting up derived values or constants before assertions, with controlled type inference from factory functions.

#### Scenario: Given with constant value
- **WHEN** `.given('c', 42)` is called
- **THEN** the constant value is available as `c` in subsequent methods

#### Scenario: Given with factory function
- **WHEN** `.given('sum', ({x, y}) => x + y)` is called
- **THEN** the factory is evaluated for each test case
- **AND** the result is available as `sum`

#### Scenario: Chained given clauses
- **WHEN** `.given('a', 1).and('b', ({a}) => a + 1)` is called
- **THEN** `b` can reference the value of `a`

#### Scenario: Type inference from factory return
- **WHEN** both constant and factory positions could infer a type parameter
- **THEN** the factory return type SHALL be the primary inference source
- **AND** type errors SHALL point to the factory function location

### Requirement: Then Clause (Assertion)

The system SHALL provide a `then(predicate)` method that defines the property to be tested.

#### Scenario: Define property assertion
- **WHEN** `.then(({x, y}) => x + y === y + x)` is called
- **THEN** the predicate is evaluated for each generated test case

#### Scenario: Chained assertions
- **WHEN** `.then(predicate1).and(predicate2)` is called
- **THEN** both predicates must hold for the property to pass

#### Scenario: And clause type inference
- **WHEN** `.and(name, valueOrFactory)` is used after `.then()`
- **THEN** the factory return type SHALL be the primary inference source for type parameter `V`
