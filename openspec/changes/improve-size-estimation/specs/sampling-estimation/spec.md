# Spec: Sampling-Based Size Estimation

## ADDED Requirements

### Requirement: Filter Size Accuracy
The `FilterArbitrary` MUST estimate its size based on the observed pass rate of its predicate, rather than assuming the base arbitrary's size.

#### Scenario: 50% Filter
Given an arbitrary `integer(0, 1000).filter(x => x % 2 == 0)`
When size is estimated
Then the result should be approximately 500 (within margin of error)
(Contrast with current behavior: 1001)

#### Scenario: Rare Filter
Given an arbitrary `integer(0, 1000).filter(x => x == 42)`
When size is estimated
Then the result should be approximately 1
(Contrast with current behavior: 1001)

### Requirement: Integration
The `oneof` and `frequency` arbitraries MUST use estimated sizes (if available/configured) to determine branch probabilities.

#### Scenario: Balanced Choice
Given `oneof(A, B)` where A is `integer(0, 10)` and B is `integer(0, 1000).filter(x < 10)`
When sampled
Then A and B should be selected with approximately equal probability (since both have effective size ~10)
(Contrast with current: B is selected ~100x more often because base size 1000 >> 10)
