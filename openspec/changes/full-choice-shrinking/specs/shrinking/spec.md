## MODIFIED Requirements

### Requirement: Default Shrinking Mode

The system SHALL use choice-based shrinking as the default shrinking mode.

#### Scenario: Default shrinking
- **WHEN** `.withShrinking()` is called without mode specification
- **THEN** the system SHALL use `ChoiceShrinker`
- **AND** shrinking operates on choice sequences, not values

#### Scenario: Opt-in value shrinking
- **WHEN** `.withShrinking({ mode: 'value' })` is called
- **THEN** the system SHALL use `PerArbitraryShrinker`
- **AND** shrinking uses the deprecated `shrink()` methods

#### Scenario: Backward compatibility
- **WHEN** existing code uses `.withShrinking()`
- **THEN** behavior MAY change to choice-based shrinking
- **AND** shrink quality should be equal or better
- **AND** a deprecation warning MAY be emitted for value mode

### Requirement: Shrink Method (Deprecated)

The system SHALL support the `shrink(initial)` method for backward compatibility but mark it as deprecated.

#### Scenario: Deprecated shrink method
- **WHEN** `arbitrary.shrink(initial)` is called
- **THEN** the method SHALL still function
- **AND** a deprecation warning MAY be logged
- **AND** documentation SHALL recommend using choice shrinking

#### Scenario: Shrink integer (deprecated)
- **WHEN** `fc.integer(0, 100).shrink({value: 50})` is called
- **THEN** an arbitrary generating values smaller than 50 is returned
- **AND** a deprecation notice indicates this is legacy behavior

### Requirement: Choice Shrinking Quality

The system SHALL ensure choice shrinking produces equal or better results than value shrinking.

#### Scenario: Integer shrinking quality
- **WHEN** shrinking an integer from N toward 0
- **THEN** choice shrinking SHALL converge in O(log N) attempts
- **AND** the result SHALL be equal to value shrinking result

#### Scenario: Composite shrinking quality
- **WHEN** shrinking a tuple or array
- **THEN** choice shrinking SHALL produce minimal counterexamples
- **AND** quality SHALL be measured by total distance from optimal

#### Scenario: Dependent generator shrinking
- **WHEN** shrinking a `.chain()` value
- **THEN** choice shrinking SHALL produce valid shrunk values
- **AND** value shrinking (if attempted) would produce no shrinking

## NEW Requirements

### Requirement: Choice Debugging

The system SHALL provide tools for debugging choice sequences.

#### Scenario: Visualize choices
- **WHEN** `ChoiceDebugger.visualize(choices, arbitrary)` is called
- **THEN** a tree representation of choice decisions is returned
- **AND** each node shows the choice value and resulting value

#### Scenario: Explain choices
- **WHEN** `ChoiceDebugger.explain(choices, arbitrary)` is called
- **THEN** an array of explanations is returned
- **AND** each explanation describes what the choice determined

#### Scenario: Diff choices
- **WHEN** `ChoiceDebugger.diff(choicesA, choicesB)` is called
- **THEN** a diff showing which choices changed is returned
- **AND** the impact on generated values is explained

### Requirement: Shrink Output Enhancement

The system SHALL include choice information in shrink output for debugging.

#### Scenario: Verbose counterexample output
- **WHEN** a property fails and verbosity is Debug or higher
- **THEN** the counterexample output SHALL include choice sequence
- **AND** annotations show what each choice determined

#### Scenario: Shrink trace
- **WHEN** shrinking completes with Debug verbosity
- **THEN** the shrink trace SHALL show choice sequence changes
- **AND** which shrink strategies were effective
