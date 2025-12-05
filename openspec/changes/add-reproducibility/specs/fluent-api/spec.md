## ADDED Requirements

### Requirement: Replay Configuration

The system SHALL provide a `replay({ seed, path? })` method to reproduce specific test cases.

#### Scenario: Replay with seed and path
- **WHEN** `.replay({ seed: 12345, path: "42:3" })` is called
- **THEN** the test SHALL generate the exact same inputs that produced the original failure
- **AND** no random generation SHALL occur beyond following the recorded path

#### Scenario: Replay with seed only
- **WHEN** `.replay({ seed: 12345 })` is called without a path
- **THEN** the test SHALL use the seed to initialize the random generator
- **AND** random generation SHALL proceed normally from that seed

#### Scenario: Invalid replay parameters
- **WHEN** `.replay({})` is called without a seed
- **THEN** an error SHALL be thrown indicating seed is required

#### Scenario: Replay after quantifiers
- **WHEN** `.replay()` is called after `.forall()` or `.exists()` quantifiers
- **THEN** the replay configuration SHALL apply to test execution
- **AND** the method SHALL return a chainable instance for further configuration

### Requirement: Regression Example (Singular)

The system SHALL provide a `withExample(example)` method to add a single regression test case with fluent composition.

#### Scenario: Single example fluent chain
- **WHEN** `.forall('x', fc.integer()).withExample({ x: 0 })` is called
- **THEN** the provided example SHALL be tested before random generation
- **AND** the method SHALL return a chainable instance

#### Scenario: Multiple examples via chaining
- **WHEN** `.withExample({ x: 0 }).withExample({ x: -1 }).withExample({ x: 100 })` is called
- **THEN** all three examples SHALL be tested in order
- **AND** random generation SHALL only occur if all examples pass

#### Scenario: Type inference from scenario
- **GIVEN** a scenario with `.forall('x', fc.integer()).forall('y', fc.string())`
- **WHEN** `.withExample(example)` is called
- **THEN** the `example` parameter SHALL be typed as `Partial<{ x: number, y: string }>`
- **AND** TypeScript SHALL report errors for incorrect property types
- **AND** TypeScript SHALL report errors for unknown property names

#### Scenario: Example after then clause
- **WHEN** `.forall('x', fc.integer()).then(pred).withExample({ x: 5 })` is written
- **THEN** the example SHALL still be type-checked against bound variables
- **AND** the example SHALL be tested before random generation

### Requirement: Regression Examples (Batch)

The system SHALL provide a `withExamples(examples[])` method to add multiple regression test cases at once.

#### Scenario: Batch examples
- **WHEN** `.withExamples([{ x: 0, y: 0 }, { x: -1, y: 1 }])` is called
- **THEN** all provided examples SHALL be tested in array order
- **AND** random generation SHALL only occur if all examples pass

#### Scenario: Partial examples in batch
- **WHEN** `.withExamples([{ x: 5 }, { y: "test" }])` is called on a scenario with variables `x` and `y`
- **THEN** each example SHALL provide only the specified variables
- **AND** unspecified variables SHALL be randomly generated

#### Scenario: Type-safe batch examples
- **GIVEN** a scenario with `.forall('x', fc.integer())`
- **WHEN** `.withExamples([{ x: "not a number" }])` is written
- **THEN** TypeScript SHALL report a type error at compile time

#### Scenario: Empty examples array
- **WHEN** `.withExamples([])` is called
- **THEN** no regression examples SHALL be tested
- **AND** random generation SHALL proceed normally

### Requirement: Verbose Mode

The system SHALL provide a `verbose(options?)` method to enable debug output during test execution.

#### Scenario: Enable verbose mode
- **WHEN** `.verbose()` is called
- **THEN** the test SHALL log each generated test case to the console
- **AND** shrinking steps SHALL be logged when finding minimal counterexamples

#### Scenario: Verbose with custom logger
- **WHEN** `.verbose({ logger: customFn })` is called
- **THEN** debug output SHALL be sent to the custom logger function
- **AND** the default console logger SHALL not be used

#### Scenario: Verbose output format
- **WHEN** verbose mode is enabled
- **THEN** each logged test case SHALL include its generation path
- **AND** pass/fail status SHALL be indicated with ✓ or ✗ symbols
- **AND** shrinking steps SHALL be prefixed with "Shrink step N:"

#### Scenario: Verbose output includes replay info
- **WHEN** a counterexample is found in verbose mode
- **THEN** the output SHALL include the seed and path
- **AND** the output SHALL suggest the `replay()` call to reproduce
