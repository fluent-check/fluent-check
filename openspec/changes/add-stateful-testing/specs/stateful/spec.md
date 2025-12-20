# Stateful Testing Specification

## ADDED Requirements

### Requirement: Stateful Test Definition

The library SHALL provide a fluent API `fc.stateful<M, S>()` for defining model-based tests where:
- `M` is the model type (simplified representation of expected behavior)
- `S` is the system-under-test type (actual implementation being tested)

#### Scenario: Define model and SUT factories

- **GIVEN** a stateful test builder
- **WHEN** `.model(() => initialModel)` and `.sut(() => initialSut)` are called
- **THEN** the factories are stored for creating fresh instances per test run

#### Scenario: Type inference for model and SUT

- **GIVEN** `fc.stateful<{ count: number }, Counter>()`
- **WHEN** commands are defined
- **THEN** TypeScript infers correct types for model and sut parameters

### Requirement: Command Definition

The library SHALL allow defining commands with:
- A unique name identifying the command
- Optional arbitrary-generated arguments via `.forall()`
- Optional precondition via `.pre()`
- Required execution logic via `.run()`
- Optional postcondition via `.post()`

#### Scenario: Command with arguments

- **GIVEN** a command builder
- **WHEN** `.forall('value', fc.integer())` is called
- **THEN** the command receives `{ value: number }` in its run function

#### Scenario: Command with precondition

- **GIVEN** a command with `.pre(model => model.elements.length > 0)`
- **WHEN** generating command sequences
- **THEN** the command is only selected when precondition passes

#### Scenario: Command execution order

- **GIVEN** a `.run(({ args }, model, sut) => ...)` handler
- **WHEN** the command executes
- **THEN** arguments are destructured first, followed by model and sut parameters

#### Scenario: Command with postcondition

- **GIVEN** a command with `.post(({}, model, sut, result) => boolean)`
- **WHEN** the command completes
- **THEN** the postcondition is checked with the run result

### Requirement: Invariant Checking

The library SHALL support system-wide invariants that are verified after every command execution.

#### Scenario: Invariant defined

- **GIVEN** `.invariant((model, sut) => sut.size() === model.count)`
- **WHEN** any command completes
- **THEN** the invariant is checked
- **AND** failure is reported if invariant returns false

#### Scenario: Multiple invariants

- **GIVEN** multiple `.invariant()` calls
- **WHEN** any command completes
- **THEN** all invariants are checked in order

### Requirement: Command Sequence Generation

The library SHALL generate random sequences of valid commands respecting preconditions.

#### Scenario: Precondition filtering

- **GIVEN** commands with various preconditions
- **WHEN** generating a sequence
- **THEN** only commands whose preconditions pass are candidates for selection

#### Scenario: Sequence length variation

- **GIVEN** `{ maxCommands: 100 }` configuration
- **WHEN** generating sequences
- **THEN** sequence lengths vary from 0 to maxCommands

#### Scenario: Argument generation per command

- **GIVEN** a command with `.forall('x', fc.integer())`
- **WHEN** the command is selected multiple times
- **THEN** each occurrence receives independently generated arguments

### Requirement: Sequence Shrinking

The library SHALL shrink failing command sequences to minimal reproductions.

#### Scenario: Length reduction

- **GIVEN** a failing sequence of 50 commands
- **WHEN** shrinking
- **THEN** shorter sequences that still fail are preferred

#### Scenario: Command removal

- **GIVEN** a failing sequence
- **WHEN** shrinking
- **THEN** individual commands are removed while preserving failure

#### Scenario: Argument shrinking

- **GIVEN** a failing sequence with command arguments
- **WHEN** shrinking
- **THEN** argument values are shrunk using their arbitrary's shrink method

#### Scenario: Precondition preservation

- **GIVEN** a shrunk sequence candidate
- **WHEN** validating the candidate
- **THEN** the sequence is rejected if any precondition would fail

### Requirement: Failure Reporting

The library SHALL report stateful test failures with full command history.

#### Scenario: Command sequence in error

- **GIVEN** a failing test
- **WHEN** reporting the error
- **THEN** the exact sequence of commands and their arguments is included

#### Scenario: Shrunk sequence reported

- **GIVEN** a shrunk failing sequence
- **WHEN** reporting the error
- **THEN** the minimal reproduction sequence is shown

### Requirement: Check Integration

The library SHALL integrate with the existing `check()` infrastructure.

#### Scenario: Running stateful check

- **GIVEN** a fully configured stateful builder
- **WHEN** `.check({ numRuns: 100, maxCommands: 50 })` is called
- **THEN** 100 random sequences of up to 50 commands are tested

#### Scenario: Seed reproducibility

- **GIVEN** a failing test with a specific seed
- **WHEN** the test is re-run with the same seed
- **THEN** the same command sequence is generated
