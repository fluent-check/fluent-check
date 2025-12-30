## NEW Requirements

### Requirement: Pick From Choices

The system SHALL provide a `pickFromChoices(stream)` method on arbitraries for choice-based generation.

#### Scenario: Default implementation
- **WHEN** `arbitrary.pickFromChoices(stream)` is called on an arbitrary without custom implementation
- **THEN** it SHALL delegate to `pick(() => stream.draw())`
- **AND** the result is equivalent to standard generation

#### Scenario: Integer with choices
- **WHEN** `fc.integer(min, max).pickFromChoices(stream)` is called
- **THEN** it SHALL use `stream.drawInt(min, max)` for deterministic mapping
- **AND** the same choice value always produces the same integer

#### Scenario: Array with choices
- **WHEN** `fc.array(element, minLen, maxLen).pickFromChoices(stream)` is called
- **THEN** it SHALL draw one choice for length
- **AND** it SHALL draw choices for each element
- **AND** the total choices consumed is 1 + length

### Requirement: Choice Stream Support Marker

The system SHALL provide a `supportsChoiceStream` property to indicate native choice support.

#### Scenario: Check support
- **WHEN** `arbitrary.supportsChoiceStream` is accessed
- **THEN** it SHALL return `true` if the arbitrary has native choice support
- **AND** it SHALL return `false` for arbitraries using default delegation

#### Scenario: ChainedArbitrary support
- **WHEN** `chainedArbitrary.supportsChoiceStream` is accessed
- **THEN** it SHALL return `true`
- **AND** this indicates choice shrinking is available

## MODIFIED Requirements

### Requirement: Chained Arbitrary

The system SHALL provide a `chain` combinator for dependent generation with choice shrinking support.

#### Scenario: Chain to dependent arbitrary
- **WHEN** `fc.integer(1, 10).chain(n => fc.array(fc.integer(), n, n))` is called
- **THEN** the array length depends on the integer value
- **AND** valid combinations are always generated

#### Scenario: Chained arbitrary with pickFromChoices
- **WHEN** `chainedArbitrary.pickFromChoices(stream)` is called
- **THEN** it SHALL draw from base arbitrary using the stream
- **AND** it SHALL use the base value to create the dependent arbitrary
- **AND** it SHALL draw from the dependent arbitrary using the SAME stream
- **AND** all choices are recorded in sequence

#### Scenario: Chain shrinking via choices
- **WHEN** a chained arbitrary value is shrunk
- **THEN** the choice sequence is shrunk
- **AND** re-generation with shrunk choices produces valid dependent values
- **AND** no `shrink()` method is needed on `ChainedArbitrary`
