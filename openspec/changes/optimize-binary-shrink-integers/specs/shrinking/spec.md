## MODIFIED Requirements

### Requirement: Shrink Method

The system SHALL provide a `shrink(initial)` method on arbitraries that returns a new arbitrary with simpler values to test. For numeric types, the system SHALL use binary search to efficiently find minimal counterexamples.

#### Scenario: Shrink integer with binary search
- **WHEN** `fc.integer(0, 1000).shrink({value: 500})` is called
- **THEN** candidates are generated using binary search toward 0
- **AND** the number of candidates is O(log N) where N is the initial value
- **AND** 0 is always tested first (if in valid range)

#### Scenario: Shrink integer
- **WHEN** `fc.integer(0, 100).shrink({value: 50})` is called
- **THEN** an arbitrary generating values smaller than 50 is returned
- **AND** the values tend toward 0 or boundary values

#### Scenario: Shrink to empty
- **WHEN** shrinking exhausts all simpler values
- **THEN** `NoArbitrary` SHALL be returned

#### Scenario: Shrink negative integer
- **WHEN** `fc.integer(-100, 100).shrink({value: -50})` is called
- **THEN** candidates are generated using binary search toward 0
- **AND** 0 is tested first (if in valid range)
- **AND** candidates approach 0 from the negative side
