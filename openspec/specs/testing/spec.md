# testing Specification

## Purpose
TBD - created by archiving change add-confidence-termination. Update Purpose after archive.
## Requirements
### Requirement: Statistical Foundation Evidence Tests

The system SHALL provide evidence tests that validate the statistical correctness of confidence-based termination using integer properties.

#### Scenario: Rare bug detection with deterministic seed
- **GIVEN** a property that fails 1 in 500 times (0.2% failure rate)
- **AND** a specific seed for reproducible behavior
- **WHEN** tested with fixed 100 samples
- **THEN** the bug is NOT found
- **AND WHEN** tested with confidence-based termination (0.99 confidence)
- **THEN** the bug IS found
- **AND** the test is reproducible (deterministic)

#### Scenario: Rare bug detection statistical validation
- **GIVEN** a property that fails 1 in 500 times (0.2% failure rate)
- **WHEN** 100 trials are run with fixed 100 samples
- **AND** 100 trials are run with confidence-based termination
- **THEN** fixed samples find bug in ~18% of trials
- **AND** confidence-based finds bug in >80% of trials
- **AND** the difference is statistically significant

#### Scenario: Confidence accuracy with low samples
- **GIVEN** a property with known 1% failure rate
- **WHEN** tested with 50 samples and 99% pass-rate threshold
- **THEN** reported confidence is LOW (<0.5)
- **AND WHEN** tested with 2000 samples
- **THEN** reported confidence is calibrated (~0.5, matching 99% true pass rate)

#### Scenario: Confidence calibration validation
- **GIVEN** a property with 0.2% failure rate
- **WHEN** 100 trials reach 90% confidence
- **AND** testing continues after confidence is met
- **THEN** bugs are found in ~10% of "confident" runs
- **AND** this validates confidence is not over-confident

#### Scenario: Adaptive test effort
- **GIVEN** a simple property that always passes
- **WHEN** tested with confidence-based termination
- **THEN** it terminates early (<500 tests)
- **AND GIVEN** a complex property with 99% pass rate
- **WHEN** tested with same confidence level
- **THEN** it runs more tests (>500 tests)
- **AND** effort adapts to property complexity

### Requirement: Real-World Scenario Evidence Tests

The system SHALL provide evidence tests that demonstrate practical value using complex types (records, nested structures).

#### Scenario: User registration validation
- **GIVEN** a UserRegistration record with email, age, username, role fields
- **AND** a validation bug that fails when email domain is 'test.com' AND role is 'admin' AND age > 65
- **WHEN** tested with fixed 200 samples
- **THEN** the bug is often missed (rare combination ~0.1% of space)
- **AND WHEN** tested with confidence-based termination
- **THEN** the bug is found reliably
- **AND** the counterexample contains email ending in test domain, admin role, age > 65

#### Scenario: API request validation
- **GIVEN** an ApiRequest record with method, path, headers (nested), and optional body
- **AND** a validation bug when POST + body present + contentType undefined
- **WHEN** tested with confidence-based termination
- **THEN** the missing content-type validation bug is found
- **AND** the counterexample shows method='POST', body defined, contentType undefined

#### Scenario: Date range edge case
- **GIVEN** a DateRange record with start date, end date, and timezone
- **AND** a business logic bug for Feb 29 + year-crossing + non-UTC timezone
- **WHEN** tested with confidence-based termination
- **THEN** the leap year edge case is found
- **AND** the counterexample shows start month=February, day=29, year-crossing range

#### Scenario: Configuration combination validation
- **GIVEN** a deeply nested AppConfig with database, cache, and features sections
- **AND** an invalid combination: sqlite + ssl + cache enabled + analytics enabled
- **WHEN** tested with confidence-based termination
- **THEN** the invalid combination is found
- **AND** the counterexample shows all four conditions present

### Requirement: Evidence Documentation

The system SHALL document evidence test results and their implications for users.

#### Scenario: Comparison table in documentation
- **WHEN** documentation is generated
- **THEN** it includes a comparison table showing detection rates
- **AND** the table compares fixed sample sizes vs confidence-based termination
- **AND** it covers both integer properties and complex type scenarios

#### Scenario: Real-world examples in documentation
- **WHEN** users read statistical-confidence.md
- **THEN** they see concrete examples with complex types
- **AND** each example explains the hidden bug pattern
- **AND** it shows why confidence-based testing is valuable

#### Scenario: Guidance on when to use confidence
- **WHEN** documentation explains usage patterns
- **THEN** it provides clear guidance on when to use confidence vs fixed samples
- **AND** it explains trade-offs (predictability vs thoroughness)
- **AND** it includes performance implications

### Requirement: Test Implementation Patterns

The system SHALL follow consistent patterns for evidence test implementation.

#### Scenario: Deterministic tests for CI
- **WHEN** evidence tests run in CI
- **THEN** deterministic tests use seeded PRNG (mulberry32)
- **AND** results are reproducible across runs
- **AND** tests complete in reasonable time (<5 seconds each)

#### Scenario: Statistical tests for validation
- **WHEN** statistical validation is needed
- **THEN** tests run 100 trials with different seeds
- **AND** results validate probabilistic claims
- **AND** tests are marked .skip or in separate suite for CI performance

#### Scenario: Complex type arbitraries
- **WHEN** testing complex types
- **THEN** existing FluentCheck arbitraries are used (fc.record, fc.patterns.email, fc.date)
- **AND** no custom test-only arbitraries are created
- **AND** examples reflect realistic user scenarios

