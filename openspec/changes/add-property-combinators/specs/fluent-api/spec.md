# Fluent API

## ADDED Requirements

### Requirement: Property Helper Functions

The system SHALL provide a `props` namespace with reusable property checking functions.

#### Scenario: Array sorted check
- **WHEN** `fc.props.sorted(arr, comparator?)` is called
- **THEN** it SHALL return `true` if the array is sorted according to the comparator
- **AND** it SHALL use default numeric comparison if no comparator provided

#### Scenario: Array uniqueness check
- **WHEN** `fc.props.unique(arr)` is called
- **THEN** it SHALL return `true` if all elements in the array are unique

#### Scenario: Array non-empty check
- **WHEN** `fc.props.nonEmpty(arr)` is called
- **THEN** it SHALL return `true` if the array has at least one element

#### Scenario: Number range check
- **WHEN** `fc.props.inRange(n, min, max)` is called
- **THEN** it SHALL return `true` if `min <= n <= max`

#### Scenario: String pattern match
- **WHEN** `fc.props.matches(s, pattern)` is called
- **THEN** it SHALL return `true` if the string matches the regex pattern

### Requirement: Composable Mathematical Property Predicates

The system SHALL provide composable predicate functions for mathematical properties that can be used within scenarios.

#### Scenario: Roundtrip predicate
- **WHEN** `fc.props.roundtrips(value, encode, decode)` is called
- **THEN** it SHALL return `true` if `decode(encode(value)) === value`
- **AND** it SHALL be usable within `.then()` clauses

#### Scenario: Idempotent predicate
- **WHEN** `fc.props.isIdempotent(value, fn)` is called
- **THEN** it SHALL return `true` if `fn(fn(value)) === fn(value)`

#### Scenario: Commutative predicate
- **WHEN** `fc.props.commutes(a, b, fn)` is called
- **THEN** it SHALL return `true` if `fn(a, b) === fn(b, a)`

#### Scenario: Associative predicate
- **WHEN** `fc.props.associates(a, b, c, fn)` is called
- **THEN** it SHALL return `true` if `fn(a, fn(b, c)) === fn(fn(a, b), c)`

#### Scenario: Identity predicate
- **WHEN** `fc.props.hasIdentity(value, fn, identity)` is called
- **THEN** it SHALL return `true` if `fn(value, identity) === value` AND `fn(identity, value) === value`

### Requirement: Property Test Templates

The system SHALL provide a `templates` namespace with pre-built property test patterns. Templates SHALL be built on top of `fc.props` predicates for code reuse.

#### Scenario: Roundtrip template
- **WHEN** `fc.templates.roundtrip(arb, encode, decode)` is used
- **THEN** it SHALL test that `decode(encode(x)) === x` for all generated values
- **AND** it SHALL return a checkable property

#### Scenario: Idempotent template
- **WHEN** `fc.templates.idempotent(arb, fn)` is used
- **THEN** it SHALL test that `fn(fn(x)) === fn(x)` for all generated values

#### Scenario: Commutative template
- **WHEN** `fc.templates.commutative(arb, fn)` is used
- **THEN** it SHALL test that `fn(a, b) === fn(b, a)` for all generated value pairs

#### Scenario: Associative template
- **WHEN** `fc.templates.associative(arb, fn)` is used
- **THEN** it SHALL test that `fn(a, fn(b, c)) === fn(fn(a, b), c)` for all generated value triples

#### Scenario: Template returns checkable
- **WHEN** any template is called
- **THEN** it SHALL return an object with `check()` method
- **AND** calling `check()` SHALL execute the property test

### Requirement: Integration with Full Scenarios

Property helpers SHALL be usable within `fc.scenario()` chains, including in `.then()` clauses, `.given()` factories, and with preconditions.

#### Scenario: Using props in then clause
- **WHEN** `fc.props.sorted()` is called within a `.then()` clause
- **THEN** it SHALL evaluate correctly using values from the scenario context
- **AND** it SHALL return a boolean that can be used in the property assertion

#### Scenario: Combining props with given/when/then
- **WHEN** `fc.props` helpers are used in `.given()` factory functions
- **AND** the results are used in `.then()` clauses
- **THEN** the helpers SHALL work correctly with derived values
- **AND** multiple property checks can be chained with `.and()`

#### Scenario: Using props with multiple arbitraries
- **WHEN** `fc.props` helpers are used in scenarios with multiple `.forall()` quantifiers
- **THEN** all context variables SHALL be accessible to the property helpers
- **AND** helpers can reference multiple context variables

#### Scenario: Using props with preconditions
- **WHEN** `fc.props` helpers are used in `fc.pre()` precondition checks
- **THEN** the helpers SHALL work correctly to skip test cases
- **AND** skipped cases SHALL be counted separately from failures
