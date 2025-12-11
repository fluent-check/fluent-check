# Tooling Specification

## ADDED Requirements

### Requirement: CPU Profiling

The system SHALL provide a script to profile CPU usage of the test suite using Node.js V8 profiler.

#### Scenario: Generate CPU profile

- **GIVEN** the test suite is configured and passing
- **WHEN** the developer runs `npm run profile:cpu`
- **THEN** a V8 CPU profile is generated in the `profiles/` directory
- **AND** the profile can be processed to identify top functions by execution time

### Requirement: Memory Profiling

The system SHALL provide a script to profile heap allocations during test suite execution.

#### Scenario: Generate heap profile

- **GIVEN** the test suite is configured and passing
- **WHEN** the developer runs `npm run profile:heap`
- **THEN** a heap profile is generated in the `profiles/` directory
- **AND** the profile can be analyzed to identify allocation hotspots

### Requirement: Flame Graph Generation

The system SHALL support generating flame graph visualizations from CPU profiles.

#### Scenario: Generate flame graph from CPU profile

- **GIVEN** a CPU profile has been generated
- **WHEN** the developer processes the profile with the provided tooling
- **THEN** an interactive HTML flame graph is produced
- **AND** the flame graph visually displays function call stacks and their relative execution times

### Requirement: Performance Baseline Documentation

The system SHALL maintain documentation of performance baselines and identified hotspots.

#### Scenario: Access performance baseline report

- **GIVEN** profiling has been executed against the test suite
- **WHEN** the developer reads `docs/performance/baseline-report.md`
- **THEN** they find documented CPU and memory hotspots with quantified metrics
- **AND** they find ranked optimization opportunities with potential impact

### Requirement: Profile Artifact Isolation

The system SHALL exclude generated profile artifacts from version control.

#### Scenario: Profile files are git-ignored

- **GIVEN** profiling scripts generate artifacts in the `profiles/` directory
- **WHEN** the developer runs `git status`
- **THEN** profile files (`.cpuprofile`, `.heapprofile`, `isolate-*.log`) are not listed as untracked
