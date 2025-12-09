## ADDED Requirements

### Requirement: Sampler Interface

The system SHALL provide a `Sampler` interface for generating samples from arbitraries.

#### Scenario: Sample method
- **WHEN** `sampler.sample(arbitrary, count)` is called
- **THEN** it SHALL return an array of `FluentPick` values
- **AND** the array length SHALL be at most `count`

#### Scenario: Sample with bias method
- **WHEN** `sampler.sampleWithBias(arbitrary, count)` is called
- **THEN** it SHALL include corner cases from the arbitrary
- **AND** remaining samples SHALL be randomly generated

#### Scenario: Sample unique method
- **WHEN** `sampler.sampleUnique(arbitrary, count)` is called
- **THEN** it SHALL return only unique values
- **AND** uniqueness SHALL be determined by the arbitrary's equals function

### Requirement: Random Sampler

The system SHALL provide a `RandomSampler` as the base sampler implementation.

#### Scenario: Random generation
- **WHEN** a RandomSampler samples from an arbitrary
- **THEN** it SHALL use the configured RNG for value generation

#### Scenario: RNG injection
- **WHEN** a RandomSampler is created with a custom RNG
- **THEN** it SHALL use that RNG for all sampling operations

### Requirement: Biased Sampler Decorator

The system SHALL provide a `BiasedSampler` that wraps another sampler.

#### Scenario: Bias toward corner cases
- **WHEN** a BiasedSampler samples from an arbitrary
- **THEN** it SHALL prioritize corner cases before random samples

### Requirement: Cached Sampler Decorator

The system SHALL provide a `CachedSampler` that memoizes samples.

#### Scenario: Cache samples
- **WHEN** a CachedSampler samples from the same arbitrary twice
- **THEN** it SHALL return the cached result on the second call

### Requirement: Deduping Sampler Decorator

The system SHALL provide a `DedupingSampler` that ensures unique samples.

#### Scenario: Deduplicate samples
- **WHEN** a DedupingSampler generates samples
- **THEN** duplicate values SHALL be filtered out

### Requirement: Sampler Composition

The system SHALL support composing samplers via decoration.

#### Scenario: Compose decorators
- **WHEN** `new CachedSampler(new BiasedSampler(new RandomSampler()))` is created
- **THEN** sampling SHALL apply all decorators in order (inner to outer)
