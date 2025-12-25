# Spec: Interleaved Shrinking

## ADDED Requirements

### Requirement: Interleaved Strategy
The framework MUST support an "Interleaved" shrinking strategy that attempts to reduce all quantifiers in a round-robin fashion, rather than sequentially exhausting one before the next.

#### Scenario: Fair Reduction
Given a property failing when `a + b > 100`
And a counterexample `(90, 90)`
When shrinking with Interleaved strategy
Then the final counterexample should be close to `(50, 50)` (e.g., `(51, 50)` or `(50, 51)`)
(Contrast with Sequential which yields `(0, 101)` or `(101, 0)`)

### Requirement: API Configuration
The `FluentStrategyFactory` MUST provide a method to select the shrinking strategy (Sequential vs Interleaved).

#### Scenario: Configuration
Given a strategy factory
When `withShrinkingStrategy('interleaved')` is called
Then the shrinker uses the interleaved algorithm
