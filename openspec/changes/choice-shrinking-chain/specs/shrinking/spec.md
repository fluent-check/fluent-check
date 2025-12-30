## NEW Requirements

### Requirement: Choice Stream

The system SHALL provide a `ChoiceStream` class for recording and replaying random decisions.

#### Scenario: Record mode
- **WHEN** a `ChoiceStream` is created in record mode
- **THEN** calls to `draw()` generate random values in [0, 1)
- **AND** each value is recorded in the choice sequence
- **AND** `getChoices()` returns all recorded values

#### Scenario: Replay mode
- **WHEN** a `ChoiceStream` is created with `ChoiceStream.replay(choices)`
- **THEN** calls to `draw()` return values from the provided sequence
- **AND** values are returned in order
- **AND** exhausting the sequence throws an error

#### Scenario: Draw integer convenience
- **WHEN** `stream.drawInt(min, max)` is called
- **THEN** it SHALL draw a choice and map it to an integer in [min, max]
- **AND** the mapping is deterministic: `floor(choice * (max - min + 1)) + min`

### Requirement: Choice Stream Shrinking

The system SHALL provide shrink candidate generation for choice sequences.

#### Scenario: Deletion shrinking
- **WHEN** `stream.shrinkCandidates()` generates candidates
- **THEN** it SHALL include sequences with choices removed
- **AND** deletion starts from the end (last choices removed first)

#### Scenario: Zeroing shrinking
- **WHEN** `stream.shrinkCandidates()` generates candidates
- **THEN** it SHALL include sequences with individual choices set to 0
- **AND** each position is tried independently

#### Scenario: Binary shrinking
- **WHEN** `stream.shrinkCandidates()` generates candidates
- **THEN** it SHALL include sequences with choices halved
- **AND** halving moves toward 0 (smaller values)

#### Scenario: Candidate ordering
- **WHEN** shrink candidates are generated
- **THEN** simpler candidates (fewer choices, smaller values) are tried first
- **AND** the order prioritizes likely-to-succeed candidates

### Requirement: Choice-Based Shrinking for Dependent Generators

The system SHALL support shrinking dependent generators (`.chain()`) using choice shrinking.

#### Scenario: Shrink chained arbitrary
- **WHEN** a `ChainedArbitrary` produces a failing value
- **THEN** the choice sequence is shrunk, not the value directly
- **AND** re-running the generator with shrunk choices produces valid dependent values

#### Scenario: Constraint preservation
- **GIVEN** `integer(1, 10).chain(n => integer(0, n - 1))`
- **WHEN** shrinking from choices that produced `(5, 3)`
- **THEN** shrunk choices ALWAYS produce valid pairs where second < first
- **AND** invalid combinations are never generated

#### Scenario: Nested chain shrinking
- **WHEN** shrinking nested `.chain()` calls
- **THEN** all levels of dependency are preserved
- **AND** the entire choice sequence is shrunk holistically

## MODIFIED Requirements

### Requirement: Automatic Shrinking on Failure

The system SHALL automatically attempt to shrink counterexamples when a property fails, using choice shrinking for dependent generators.

#### Scenario: Find minimal counterexample
- **WHEN** a property fails with a complex counterexample
- **THEN** the system SHALL iteratively shrink to find a simpler failing case
- **AND** the final counterexample in the result is the minimal found

#### Scenario: Shrink dependent generators
- **WHEN** a property using `.chain()` fails
- **THEN** the system SHALL use choice shrinking automatically
- **AND** dependent constraints are preserved during shrinking

### Requirement: Shrinking Through Transformations

The system SHALL support shrinking through `map`, `filter`, and `chain` transformations.

#### Scenario: Shrink mapped arbitrary
- **WHEN** a mapped arbitrary like `fc.integer().map(n => n * 2)` is shrunk
- **THEN** shrinking occurs on the underlying integer
- **AND** results are transformed through the map function

#### Scenario: Shrink filtered arbitrary
- **WHEN** a filtered arbitrary is shrunk
- **THEN** shrunk values that don't pass the filter are excluded

#### Scenario: Shrink chained arbitrary
- **WHEN** a chained arbitrary like `fc.integer(1, 10).chain(n => fc.array(fc.integer(), n, n))` is shrunk
- **THEN** shrinking uses choice shrinking to preserve the dependency
- **AND** the array length always matches the first integer
