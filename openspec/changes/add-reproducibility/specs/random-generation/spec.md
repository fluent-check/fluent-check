## ADDED Requirements

### Requirement: Path Tracking

The system SHALL track a generation path representing the sequence of choices made during test case generation.

#### Scenario: Path format
- **WHEN** a test runs and generates values
- **THEN** the path SHALL be a colon-separated string of sample indices (e.g., `"42:7:3"`)
- **AND** each index corresponds to a quantifier in declaration order

#### Scenario: Path recorded during generation
- **WHEN** the strategy iterates through test cases
- **THEN** each `pickNum` value SHALL be captured for the path
- **AND** the complete path SHALL uniquely identify a test case given the same seed

#### Scenario: Path with shrinking
- **WHEN** a counterexample is found and shrinking occurs
- **THEN** the path SHALL be suffixed with `:s<depth>` (e.g., `"42:7:s3"`)
- **AND** the shrink depth SHALL increment with each shrinking step

#### Scenario: Path reset between test runs
- **WHEN** `.check()` is called multiple times
- **THEN** each run SHALL start with an empty path
- **AND** paths from previous runs SHALL not affect current generation

### Requirement: Path-Guided Generation

The system SHALL support path-guided generation that follows a recorded path to reproduce specific test cases.

#### Scenario: Follow recorded path
- **WHEN** a path `"42:7"` is provided to `replay()`
- **THEN** the first quantifier SHALL use its 42nd sample
- **AND** the second quantifier SHALL use its 7th sample
- **AND** no iteration over other samples SHALL occur

#### Scenario: Path with shrink suffix
- **WHEN** a path `"42:7:s3"` is provided to `replay()`
- **THEN** generation SHALL start at indices 42 and 7
- **AND** shrinking SHALL be performed 3 times from that point

#### Scenario: Path exhaustion
- **WHEN** the scenario has more quantifiers than path indices
- **THEN** extra quantifiers SHALL use normal random generation
- **AND** the extended path SHALL be recorded in the result

#### Scenario: Path validation
- **WHEN** a path index exceeds available samples (e.g., index 1000 with sampleSize 100)
- **THEN** an error SHALL be thrown indicating invalid path
- **AND** the error message SHALL include the problematic index and variable name

#### Scenario: Malformed path
- **WHEN** a path with invalid format is provided (e.g., `"abc:xyz"`)
- **THEN** an error SHALL be thrown indicating path parse failure
- **AND** the expected format SHALL be included in the error message
