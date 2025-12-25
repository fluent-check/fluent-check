# Spec: Edge-Biased Lengths

## ADDED Requirements

### Requirement: Edge-Biased Default
Collection arbitraries (`array`, `string`) MUST use an edge-biased distribution for their length by default, significantly increasing the probability of generating minimum and maximum length instances.

#### Scenario: Empty Array Generation
Given an `array(integer())` arbitrary
When sampled 100 times
Then it should produce empty arrays at least 5 times (5%)
(Contrast with Uniform [0,10] which would be ~9%)
Wait, Uniform [0,10] is 1/11 = 9%.
If max is 1000. Uniform is 0.1%. Edge-biased should be ~10%.

#### Scenario: Large Array Generation
Given an `array(integer(), 0, 1000)` arbitrary
When sampled 100 times
Then it should produce arrays of length 1000 at least 5 times (5%)
(Contrast with Uniform which would be ~0.1%)

### Requirement: Uniform Option
The framework MUST provide a way to request uniform length distribution if needed.

#### Scenario: Uniform Override
Given an `array(integer())` configured with `withUniformLength()`
When sampled
Then the lengths should be uniformly distributed
