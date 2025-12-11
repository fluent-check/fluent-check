## ADDED Requirements

### Requirement: Arbitrary Law Testing Framework

The system SHALL provide a law-checking framework for verifying that arbitrary implementations satisfy universal contracts.

#### Scenario: Running laws against an arbitrary
- **WHEN** `arbitraryLaws.check(arbitrary)` is called
- **THEN** all applicable laws SHALL be verified
- **AND** a result indicating pass/fail for each law SHALL be returned

### Requirement: Sample Validity Law

The system SHALL verify that all values produced by `sample()` can be recognized by `canGenerate()`.

#### Scenario: Sampled values are valid picks
- **WHEN** `sample(n)` is called on any arbitrary
- **THEN** every pick in the result SHALL satisfy `canGenerate(pick) === true`

### Requirement: Sample Size Bound Law

The system SHALL verify that `sample(n)` returns at most `n` picks, bounded by the arbitrary's size.

#### Scenario: Sample respects requested size
- **WHEN** `sample(n)` is called on an arbitrary with `size().value >= n`
- **THEN** the result length SHALL equal `n`

#### Scenario: Sample respects arbitrary size
- **WHEN** `sample(n)` is called on an arbitrary with `size().value < n`
- **THEN** the result length SHALL be at most `size().value`

### Requirement: Unique Sample Uniqueness Law

The system SHALL verify that `sampleUnique(n)` returns distinct values.

#### Scenario: Unique samples have no duplicates
- **WHEN** `sampleUnique(n)` is called on any arbitrary
- **THEN** all returned picks SHALL have distinct `value` properties

### Requirement: Corner Case Inclusion Law

The system SHALL verify that `sampleWithBias()` includes corner cases when sample size allows.

#### Scenario: Corner cases included in biased sample
- **WHEN** `sampleWithBias(n)` is called with `n >= cornerCases().length`
- **THEN** all corner case values SHALL appear in the sample

### Requirement: Shrink Produces Smaller Values Law

The system SHALL verify that shrinking produces values that are "smaller" than the original.

#### Scenario: Shrunk values are strictly smaller
- **WHEN** `shrink(pick).sample(m)` is called
- **THEN** all shrunk values SHALL be smaller than `pick.value` according to the arbitrary's ordering

### Requirement: Shrink Termination Law

The system SHALL verify that repeated shrinking eventually produces `NoArbitrary`.

#### Scenario: Shrinking converges
- **WHEN** shrinking is applied iteratively starting from any pick
- **THEN** the process SHALL eventually produce an arbitrary with `size().value === 0`

### Requirement: Filter Respects Predicate Law

The system SHALL verify that filtered arbitraries only generate values satisfying the predicate.

#### Scenario: Filtered samples satisfy predicate
- **WHEN** `arbitrary.filter(predicate).sample(n)` is called
- **THEN** every sampled value SHALL satisfy `predicate(value) === true`

### Requirement: NoArbitrary Composition Law

The system SHALL verify that operations on `NoArbitrary` preserve the empty state.

#### Scenario: Map on NoArbitrary
- **WHEN** `NoArbitrary.map(f)` is called
- **THEN** `NoArbitrary` SHALL be returned

#### Scenario: Filter on NoArbitrary
- **WHEN** `NoArbitrary.filter(p)` is called
- **THEN** `NoArbitrary` SHALL be returned

### Requirement: Arbitrary Registry for Meta-Testing

The system SHALL provide a collection of representative arbitraries for law verification.

#### Scenario: Registry includes all arbitrary types
- **WHEN** the arbitrary registry is enumerated
- **THEN** it SHALL include instances of integer, real, boolean, string, array, set, tuple, oneof, union, constant, record, and transformed (mapped/filtered) arbitraries

### Requirement: Law Failure Reporting

The system SHALL provide descriptive failure messages when laws are violated.

#### Scenario: Failure identifies arbitrary
- **WHEN** a law check fails
- **THEN** the failure message SHALL identify which arbitrary was tested
- **AND** the failure message SHALL describe which law was violated
- **AND** the failure message SHALL include the counterexample if applicable
