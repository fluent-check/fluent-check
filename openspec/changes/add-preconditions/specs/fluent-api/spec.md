# Fluent API

## ADDED Requirements

### Requirement: Precondition Assertions

The system SHALL provide a `pre()` function for asserting preconditions within property test bodies.

#### Scenario: Basic precondition
- **WHEN** `fc.pre(condition)` is called within a `then()` callback
- **AND** the condition is `false`
- **THEN** the current test case SHALL be skipped
- **AND** it SHALL NOT count as a property failure

#### Scenario: Precondition passes
- **WHEN** `fc.pre(condition)` is called within a `then()` callback
- **AND** the condition is `true`
- **THEN** execution SHALL continue normally
- **AND** the test case SHALL be evaluated

#### Scenario: Precondition with message
- **WHEN** `fc.pre(condition, message)` is called
- **AND** the condition is `false`
- **THEN** the message SHALL be available for debugging purposes

#### Scenario: Multiple preconditions
- **WHEN** multiple `fc.pre()` calls are made in a single test
- **THEN** all preconditions SHALL be checked in order
- **AND** the test SHALL be skipped if any precondition fails

#### Scenario: Type narrowing
- **WHEN** `fc.pre(condition)` returns successfully
- **THEN** TypeScript SHALL narrow the type based on the condition
- **AND** `pre` SHALL have return type `asserts condition`
