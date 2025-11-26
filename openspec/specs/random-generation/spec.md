# Random Generation

## Purpose

Seeded random number generation for reproducible property-based tests.

## Requirements

### Requirement: FluentRandomGenerator

The system SHALL provide a `FluentRandomGenerator` class for managing random number generation.

#### Scenario: Default generator
- **WHEN** a new FluentRandomGenerator is created without arguments
- **THEN** it uses `Math.random` as the underlying generator
- **AND** a random seed is generated

#### Scenario: Custom generator
- **WHEN** a custom generator builder is provided
- **THEN** that builder is used to create the random generator

### Requirement: Seed Management

The system SHALL support seed-based reproducibility.

#### Scenario: Provide seed
- **WHEN** a seed is provided to FluentRandomGenerator
- **THEN** the generator produces deterministic sequences

#### Scenario: Retrieve seed
- **WHEN** a test completes
- **THEN** the seed used is available in the result for reproduction

### Requirement: Custom Generator Support

The system SHALL provide `withGenerator(builder, seed?)` for using custom PRNGs.

#### Scenario: Custom PRNG
- **WHEN** `.withGenerator((seed) => customRng(seed))` is called
- **THEN** the custom PRNG is used for all value generation

#### Scenario: Reproducible with custom PRNG
- **WHEN** the same seed is used with the same custom PRNG
- **THEN** the same sequence of test cases is generated

### Requirement: Generator Initialization

The system SHALL initialize the generator before each test run.

#### Scenario: Initialize before test
- **WHEN** `.check()` is called
- **THEN** the random generator is initialized with its seed
- **AND** consistent results are produced for the same seed

### Requirement: Generator Propagation

The system SHALL propagate the random generator through the test chain.

#### Scenario: Shared generator
- **WHEN** multiple quantifiers are chained
- **THEN** they all share the same random generator instance
- **AND** this ensures deterministic behavior with a given seed
