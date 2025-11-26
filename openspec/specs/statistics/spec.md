# Statistics

## Purpose

Statistical distributions and confidence calculations for property-based testing.

## Requirements

### Requirement: Distribution Base Class

The system SHALL provide an abstract `Distribution` class for probability distributions.

#### Scenario: Distribution interface
- **WHEN** a Distribution is implemented
- **THEN** it MUST provide `mean()`, `mode()`, `pdf(x)`, `cdf(x)`, and `inv(p)` methods

### Requirement: Integer Distribution

The system SHALL provide an `IntegerDistribution` class for discrete distributions over contiguous integers.

#### Scenario: Support bounds
- **WHEN** an IntegerDistribution is queried
- **THEN** `supportMin()` and `supportMax()` return the distribution bounds

#### Scenario: Default mean implementation
- **WHEN** `mean()` is not overridden
- **THEN** it is calculated by summing k times pdf(k) over the support

#### Scenario: Default mode implementation
- **WHEN** `mode()` is not overridden
- **THEN** it is calculated by finding the k with maximum pdf(k)

#### Scenario: Default CDF implementation
- **WHEN** `cdf(k)` is not overridden
- **THEN** it is calculated by summing pdf(k) from supportMin to k

#### Scenario: Default inverse CDF implementation
- **WHEN** `inv(p)` is not overridden
- **THEN** it is calculated using binary search on the CDF

### Requirement: Beta Distribution

The system SHALL provide a `BetaDistribution` class implementing the beta distribution.

#### Scenario: Create beta distribution
- **WHEN** `new BetaDistribution(alpha, beta)` is called
- **THEN** a beta distribution with the given parameters is created

#### Scenario: Beta statistics
- **WHEN** a BetaDistribution is queried
- **THEN** `mean()`, `mode()`, `pdf()`, `cdf()`, and `inv()` return correct values

### Requirement: Beta-Binomial Distribution

The system SHALL provide a `BetaBinomialDistribution` class for modeling trial outcomes with uncertainty.

#### Scenario: Create beta-binomial distribution
- **WHEN** `new BetaBinomialDistribution(trials, alpha, beta)` is called
- **THEN** a beta-binomial distribution is created

#### Scenario: Closed-form mean
- **WHEN** `mean()` is called
- **THEN** it returns trials times alpha divided by (alpha plus beta) in constant time

#### Scenario: Closed-form mode
- **WHEN** `mode()` is called
- **THEN** it returns the mode in constant time
- **AND** handles edge cases where alpha or beta is less than or equal to 1

#### Scenario: PDF via log probability
- **WHEN** `pdf(x)` is called
- **THEN** it is computed via exponentiation of log probability for numerical stability

### Requirement: Arbitrary Size Estimation

The system SHALL use statistical methods to estimate the size of filtered arbitraries.

#### Scenario: Exact size for bounded
- **WHEN** `size()` is called on `fc.integer(0, 10)`
- **THEN** the type is 'exact' and value is 11

#### Scenario: Estimated size for filtered
- **WHEN** `size()` is called on a filtered arbitrary
- **THEN** the type is 'estimated'
- **AND** a credible interval is provided

#### Scenario: Credible interval
- **WHEN** size estimation returns a credible interval
- **THEN** it represents statistical confidence bounds on the true size
