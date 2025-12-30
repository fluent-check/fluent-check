## MODIFIED Requirements

### Requirement: Shrink Iterator Interface

The system SHALL provide a `ShrinkIterator<A>` interface for lazy, feedback-driven shrink candidate generation.

#### Scenario: Iterator protocol
- **WHEN** `arbitrary.shrinkIterator(initial)` is called
- **THEN** it SHALL return a `ShrinkIterator<A>` that lazily yields candidates
- **AND** candidates are generated on-demand, not pre-sampled

#### Scenario: Feedback methods
- **WHEN** a shrink candidate is tested
- **THEN** `iterator.acceptSmaller()` can be called if the property still fails
- **AND** `iterator.rejectSmaller()` can be called if the property passes
- **AND** subsequent candidates are guided by this feedback

#### Scenario: Binary search for integers
- **WHEN** shrinking an integer from value N toward target T
- **THEN** the iterator SHALL use binary search: try (N+T)/2 first
- **AND** if accepted, focus on [T, mid]; if rejected, focus on [mid+1, N]
- **AND** convergence is O(log(N-T)) candidates

### Requirement: Shrink Method

The system SHALL provide a `shrink(initial)` method on arbitraries that returns a new arbitrary with simpler values to test.

#### Scenario: Shrink integer
- **WHEN** `fc.integer(0, 100).shrink({value: 50})` is called
- **THEN** an arbitrary generating values smaller than 50 is returned
- **AND** the values tend toward 0 or boundary values

#### Scenario: Shrink to empty
- **WHEN** shrinking exhausts all simpler values
- **THEN** `NoArbitrary` SHALL be returned

#### Scenario: Default iterator wraps shrink
- **WHEN** an arbitrary does not implement `shrinkIterator()`
- **THEN** the default implementation SHALL wrap `shrink()` using random sampling
- **AND** backward compatibility is preserved

### Requirement: Lazy Shrinking in Shrinker

The system SHALL use lazy iterators when shrinking counterexamples.

#### Scenario: Iterator-based shrinking
- **WHEN** the shrinker attempts to shrink a quantifier's value
- **THEN** it SHALL use `shrinkIterator()` if available
- **AND** it SHALL call `acceptSmaller()`/`rejectSmaller()` to guide the search
- **AND** it SHALL stop when budget is exhausted or iterator is exhausted

#### Scenario: Efficient budget usage
- **WHEN** shrinking with a budget of N attempts
- **THEN** at most N candidates are generated and tested
- **AND** no candidates are pre-sampled beyond what is tested

## NEW Requirements

### Requirement: Shrink Iterator Bounds

The system SHALL provide bounds information for diagnostic purposes.

#### Scenario: Get current bounds
- **WHEN** `iterator.getBounds()` is called
- **THEN** it SHALL return the current search range `{ lower, upper }`
- **AND** this reflects the effect of previous `acceptSmaller()`/`rejectSmaller()` calls

### Requirement: Array Lazy Shrinking

The system SHALL provide lazy shrinking for arrays that interleaves length and element shrinking.

#### Scenario: Lazy array length shrinking
- **WHEN** shrinking an array of length N
- **THEN** the iterator SHALL try progressively shorter lengths
- **AND** lengths are tried in binary search order when feedback is provided

#### Scenario: Lazy array element shrinking
- **WHEN** shrinking array elements
- **THEN** element shrink candidates are generated lazily
- **AND** elements are interleaved fairly (round-robin through positions)

### Requirement: Tuple Lazy Shrinking

The system SHALL provide lazy shrinking for tuples that interleaves element positions.

#### Scenario: Lazy tuple shrinking
- **WHEN** shrinking a tuple with N elements
- **THEN** the iterator SHALL interleave candidates from each position
- **AND** each position's iterator is advanced in round-robin order
- **AND** feedback is applied to the appropriate position's iterator
