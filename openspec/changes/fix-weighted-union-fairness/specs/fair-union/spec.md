# Spec: Fair Weighted Union

## MODIFIED Requirements

### Requirement: Weighted Selection Accuracy
The `frequency` arbitrary MUST select branches with probabilities matching the provided weights within statistical margins of error (e.g., passing a Chi-squared test with p > 0.05).

#### Scenario: Extreme Ratios
Given a frequency arbitrary with weights `{ 1: A, 99: B }`
When sampled 100,000 times
Then `A` should be selected approximately 1000 times
And the selection distribution should pass a Chi-squared goodness-of-fit test

### Requirement: Uniform Selection Accuracy
The `oneof` arbitrary MUST select branches with equal probability.

#### Scenario: Equal Weights
Given a `oneof(A, B, C)` arbitrary
When sampled 30,000 times
Then each branch should be selected approximately 10,000 times
And the distribution should pass a Chi-squared goodness-of-fit test
