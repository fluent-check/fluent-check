## MODIFIED Requirements

### Requirement: Per-Arbitrary Shrinker

The system SHALL provide a `PerArbitraryShrinker` that shrinks each quantifier independently using lazy iterators.

#### Scenario: Shrink individual arbitraries with iterators
- **WHEN** shrinking a counterexample with multiple quantifiers
- **THEN** each quantifier's value SHALL be shrunk using `shrinkIterator()` when available
- **AND** the shrinker SHALL provide feedback via `acceptSmaller()`/`rejectSmaller()`
- **AND** the property SHALL be re-evaluated to confirm failure

#### Scenario: Fallback to eager shrinking
- **WHEN** an arbitrary does not provide `shrinkIterator()`
- **THEN** the shrinker SHALL fall back to `shrink()` with sampling
- **AND** backward compatibility is maintained

#### Scenario: Use arbitrary shrink method
- **WHEN** shrinking a value
- **THEN** it SHALL use the arbitrary's `shrink()` method to generate candidates

### Requirement: Shrink Budget with Iterators

The system SHALL respect budget constraints when using lazy iterators.

#### Scenario: Max attempts with iterators
- **WHEN** `budget.maxAttempts` is set to N
- **THEN** the shrinker SHALL test at most N candidates from iterators
- **AND** iterators are not advanced beyond what is tested

#### Scenario: Iterator exhaustion
- **WHEN** a shrink iterator yields no more candidates
- **THEN** the shrinker SHALL move to the next quantifier or round
- **AND** budget is conserved for remaining quantifiers

## NEW Requirements

### Requirement: Iterator-Based Shrink Round Strategy

The system SHALL support shrink round strategies that work with lazy iterators.

#### Scenario: Round-robin with iterators
- **WHEN** using Round-Robin strategy with lazy iterators
- **THEN** each quantifier's iterator is advanced once per round
- **AND** feedback is provided after each candidate is tested
- **AND** iterators maintain state across rounds

#### Scenario: Delta-debugging with iterators
- **WHEN** using Delta-Debugging strategy with lazy iterators
- **THEN** the strategy can leverage iterator feedback for smarter grouping
- **AND** rejected groups inform subsequent partitioning

### Requirement: ExecutableQuantifier Iterator Support

The system SHALL extend `ExecutableQuantifier` to support lazy shrinking.

#### Scenario: Shrink iterator method
- **WHEN** `quantifier.shrinkIterator(pick)` is called
- **THEN** it SHALL return a `ShrinkIterator` for the quantifier's arbitrary
- **AND** the iterator respects the arbitrary's shrink direction

#### Scenario: Check iterator availability
- **WHEN** the shrinker needs to shrink a quantifier
- **THEN** it SHALL check if `shrinkIterator` is available
- **AND** use it preferentially over `shrink()` with sampling
