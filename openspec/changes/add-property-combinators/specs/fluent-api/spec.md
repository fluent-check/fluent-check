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

### Requirement: Property Test Templates

The system SHALL provide a `templates` namespace with pre-built property test patterns.

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
