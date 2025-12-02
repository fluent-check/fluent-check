## ADDED Requirements

### Requirement: Shrink Strategy Configuration

The system SHALL allow users to configure the shrink search strategy.

#### Scenario: Configure best-effort shrinking
- **WHEN** `.withShrinkStrategy('best-effort')` is called on strategy builder
- **THEN** shrinking uses sampling-based candidate selection
- **AND** this is the default behavior when no strategy is specified

#### Scenario: Configure exhaustive shrinking
- **WHEN** `.withShrinkStrategy('exhaustive')` is called on strategy builder
- **THEN** shrinking enumerates all candidates up to `shrinkSize` limit
- **AND** the guaranteed-minimal counterexample within the limit is found

#### Scenario: Configure auto shrink strategy
- **WHEN** `.withShrinkStrategy('auto')` is called on strategy builder
- **AND** `.withExhaustiveShrinkThreshold(100)` is configured
- **THEN** shrinking uses exhaustive search if arbitrary's `size()` is below threshold
- **AND** shrinking uses best-effort if `size()` exceeds threshold

### Requirement: Exhaustive Shrink Threshold

The system SHALL allow configuration of the threshold for auto-selecting exhaustive shrinking.

#### Scenario: Set exhaustive threshold
- **WHEN** `.withExhaustiveShrinkThreshold(50)` is called
- **AND** shrink strategy is `'auto'`
- **THEN** arbitraries with `size() < 50` use exhaustive shrinking
- **AND** arbitraries with `size() >= 50` use best-effort shrinking

#### Scenario: Default threshold
- **WHEN** shrink strategy is `'auto'` with no threshold configured
- **THEN** a sensible default threshold (e.g., 100) is used
