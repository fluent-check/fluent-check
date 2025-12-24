## ADDED Requirements

### Requirement: Statistical Apparatus Evidence Studies

The system SHALL provide empirical evidence for statistical mechanisms beyond confidence-based termination.

#### Scenario: Biased sampling impact evidence
- **WHEN** `npm run evidence:biased-sampling` is executed
- **THEN** the study SHALL compare BiasedSampler vs RandomSampler detection rates
- **AND** results SHALL be output to `docs/evidence/raw/biased-sampling.csv`
- **AND** visualizations SHALL be generated in `docs/evidence/figures/`

#### Scenario: Weighted union probability evidence
- **WHEN** `npm run evidence:weighted-union` is executed
- **THEN** the study SHALL validate that ArbitraryComposite samples proportionally by size
- **AND** chi-squared goodness-of-fit tests SHALL be applied
- **AND** results SHALL include both exact and estimated size unions

#### Scenario: Corner case coverage evidence
- **WHEN** `npm run evidence:corner-cases` is executed
- **THEN** the study SHALL measure what percentage of bugs are found via corner cases
- **AND** results SHALL attribute each bug detection to corner case or random sample

#### Scenario: Filter cascade impact evidence
- **WHEN** `npm run evidence:filter-cascade` is executed
- **THEN** the study SHALL measure size estimation accuracy across filter chain depths
- **AND** credible interval coverage SHALL be validated

#### Scenario: Deduplication efficiency evidence
- **WHEN** `npm run evidence:deduplication` is executed
- **THEN** the study SHALL measure unique sample generation and overhead
- **AND** termination guard trigger rates SHALL be tracked

#### Scenario: Mapped arbitrary size evidence
- **WHEN** `npm run evidence:mapped-size` is executed
- **THEN** the study SHALL compare reported size vs actual distinct values for non-bijective maps

#### Scenario: Chained arbitrary distribution evidence
- **WHEN** `npm run evidence:chained-distribution` is executed
- **THEN** the study SHALL characterize the distribution created by flatMap
- **AND** empirical distribution SHALL be compared to theoretical predictions

#### Scenario: Shrinking fairness evidence
- **WHEN** `npm run evidence:shrinking-fairness` is executed
- **THEN** the study SHALL measure shrinking effort per quantifier position

#### Scenario: Caching trade-off evidence
- **WHEN** `npm run evidence:caching` is executed
- **THEN** the study SHALL compare CachedSampler vs fresh sampling for detection diversity

#### Scenario: Sample budget evidence
- **WHEN** `npm run evidence:sample-budget` is executed
- **THEN** the study SHALL validate the per-quantifier sample formula for nested quantifiers

#### Scenario: Streaming statistics accuracy evidence
- **WHEN** `npm run evidence:streaming-accuracy` is executed
- **THEN** the study SHALL validate P² and Welford's algorithms against exact computation

#### Scenario: Length distribution evidence
- **WHEN** `npm run evidence:length-distribution` is executed
- **THEN** the study SHALL compare uniform vs alternative length distributions for bug detection

### Requirement: Evidence Study Reproducibility

Each statistical apparatus evidence study SHALL be reproducible with deterministic seeds.

#### Scenario: Deterministic evidence generation
- **WHEN** the same evidence study is run twice with the same seed
- **THEN** the CSV output SHALL be identical

#### Scenario: Seed documentation
- **WHEN** evidence data is generated
- **THEN** the seed used SHALL be recorded in the CSV header or metadata

### Requirement: Evidence Visualization Standards

All statistical apparatus evidence visualizations SHALL follow consistent standards.

#### Scenario: Figure format consistency
- **WHEN** evidence visualizations are generated
- **THEN** they SHALL use the same color palette as existing evidence figures
- **AND** error bars SHALL represent 95% confidence intervals
- **AND** sample sizes SHALL be annotated on each data point

#### Scenario: Publication quality
- **WHEN** figures are generated
- **THEN** they SHALL be suitable for documentation embedding at 150 DPI
- **AND** axis labels and legends SHALL be clearly readable

### Requirement: Evidence Study Aggregation

The system SHALL provide a way to run all apparatus evidence studies together.

#### Scenario: Run all apparatus studies
- **WHEN** `npm run evidence:apparatus` is executed
- **THEN** all 12 apparatus studies SHALL be executed sequentially
- **AND** a summary report SHALL be generated

#### Scenario: Quick mode for apparatus studies
- **WHEN** `npm run evidence:apparatus:quick` is executed
- **THEN** all studies SHALL run with reduced trial counts for faster feedback
