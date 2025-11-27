## ADDED Requirements

### Requirement: ArbitraryStatistics

The system SHALL provide detailed per-arbitrary statistics when enabled.

#### Scenario: Samples and uniqueness
- **WHEN** detailed statistics are enabled
- **THEN** `arbitraryStats[name].samplesGenerated` SHALL contain sample count
- **AND** `arbitraryStats[name].uniqueValues` SHALL contain unique value count

#### Scenario: Corner case tracking
- **WHEN** detailed statistics are enabled
- **THEN** `arbitraryStats[name].cornerCases.tested` SHALL list tested corner cases
- **AND** `arbitraryStats[name].cornerCases.total` SHALL show total known corner cases

#### Scenario: Distribution summary
- **WHEN** detailed statistics are enabled for numeric arbitraries
- **THEN** `arbitraryStats[name].distribution` SHALL contain min, max, mean, median
- **AND** percentiles SHALL be available

### Requirement: Statistics Formatting

The system SHALL provide methods to format statistics for output.

#### Scenario: Format as text
- **WHEN** `FluentReporter.formatStatistics(stats, { format: 'text' })` is called
- **THEN** a human-readable string SHALL be returned

#### Scenario: Format as JSON
- **WHEN** `FluentReporter.formatStatistics(stats, { format: 'json' })` is called
- **THEN** a JSON string SHALL be returned

#### Scenario: Format as markdown
- **WHEN** `FluentReporter.formatStatistics(stats, { format: 'markdown' })` is called
- **THEN** a markdown-formatted string SHALL be returned with tables
