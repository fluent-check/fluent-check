# Spec: Adaptive Deduplication

## ADDED Requirements

### Requirement: Automatic Activation
The framework MUST automatically use deduplicated sampling for a quantifier when its estimated size is significantly smaller than the requested number of samples.

#### Scenario: Small Domain
Given an arbitrary `integer(0, 10)` (size 11)
And a sample budget of 50
When explored
Then it should use deduplication logic (likely finding all 11 values)
And stop early when exhausted (if applicable)

#### Scenario: Large Domain
Given an arbitrary `integer(0, 1000000)`
And a sample budget of 50
When explored
Then it should NOT use deduplication logic (avoiding overhead)

### Requirement: Configuration
The framework MUST allow users to disable adaptive deduplication.

#### Scenario: Opt-out
Given a scenario configured with `withoutAdaptiveDeduplication()`
When explored
Then it should use standard random sampling regardless of domain size
