# Statistical Foundations for Confidence-Based Testing

This document details the mathematical foundations for implementing confidence-based termination and statistical features in FluentCheck.

## 1. Bayesian Posterior for Property Satisfaction

### Problem Statement

Given:
- A property P that should hold for all inputs from domain D
- n test cases sampled uniformly from D
- k failures observed (property P returned false)

Calculate: The posterior probability that P holds for all inputs in D.

### Mathematical Framework

#### Prior Distribution

We model the success rate θ (probability that a random input satisfies P) as a random variable. Before observing any tests, we use a prior distribution.

**Recommended Prior: Beta(1, 1) = Uniform(0, 1)**

```
π(θ) = 1  for θ ∈ [0, 1]
```

This is a non-informative prior that assumes no prior knowledge about the success rate.

**Alternative Priors:**

| Prior | Beta(α, β) | Use Case |
|-------|------------|----------|
| Uniform | Beta(1, 1) | Default, no prior knowledge |
| Jeffrey's | Beta(0.5, 0.5) | Maximum entropy, mathematically elegant |
| Weakly informative | Beta(2, 1) | Slight bias toward higher success rates |
| Skeptical | Beta(1, 2) | Slight bias toward lower success rates |

#### Likelihood Function

Given success rate θ, the probability of observing n-k successes and k failures follows a Binomial distribution:

```
P(data | θ) = C(n, k) × θ^(n-k) × (1-θ)^k
```

#### Posterior Distribution

Using Bayes' theorem with a Beta(α, β) prior:

```
P(θ | data) ∝ P(data | θ) × π(θ)
           ∝ θ^(n-k) × (1-θ)^k × θ^(α-1) × (1-θ)^(β-1)
           = θ^(α + n - k - 1) × (1-θ)^(β + k - 1)
```

This is a **Beta(α + n - k, β + k)** distribution.

For the uniform prior Beta(1, 1):
- **Posterior: Beta(1 + n - k, 1 + k) = Beta(n - k + 1, k + 1)**

### Implementation

```typescript
import { BetaDistribution } from './statistics'

/**
 * Calculate the posterior distribution for the success rate
 * after observing n tests with k failures.
 */
function posteriorDistribution(
  n: number,           // Total tests
  k: number,           // Failures
  priorAlpha = 1,      // Prior α parameter
  priorBeta = 1        // Prior β parameter
): BetaDistribution {
  return new BetaDistribution(
    priorAlpha + n - k,  // Posterior α = prior α + successes
    priorBeta + k        // Posterior β = prior β + failures
  )
}

/**
 * Calculate confidence that the property holds for all inputs.
 * 
 * Since we cannot know if θ = 1 exactly, we approximate:
 * confidence = P(θ > 1 - ε) where ε is a small tolerance
 * 
 * @param n - Total tests run
 * @param k - Number of failures
 * @param epsilon - Tolerance (default: 10^-6)
 */
function calculateConfidence(
  n: number,
  k: number,
  epsilon = 1e-6
): number {
  if (k > 0) {
    // If any failures, confidence is essentially 0
    // (we found a counterexample)
    return 0
  }
  
  const posterior = posteriorDistribution(n, 0)
  // P(θ > 1 - ε) = 1 - CDF(1 - ε)
  return 1 - posterior.cdf(1 - epsilon)
}
```

### Confidence Interpretation

For n passing tests and 0 failures with a uniform prior:

| Tests (n) | Confidence P(θ > 0.9999) | Interpretation |
|-----------|--------------------------|----------------|
| 100 | 0.01 | Very low confidence |
| 1,000 | 0.10 | Low confidence |
| 5,000 | 0.39 | Moderate confidence |
| 10,000 | 0.63 | Reasonable confidence |
| 50,000 | 0.99 | High confidence |
| 100,000 | 0.9999 | Very high confidence |

**Key Insight**: The number of tests needed grows proportionally to 1/ε where ε is the acceptable failure rate.

## 2. Credible Intervals

### Definition

A 95% credible interval [L, U] for θ means:
- P(L ≤ θ ≤ U | data) = 0.95
- There is a 95% probability that the true success rate lies within this interval

### Calculation Methods

#### Equal-Tailed Interval

The simplest approach: use the 2.5th and 97.5th percentiles.

```typescript
function equalTailedCredibleInterval(
  n: number,
  k: number,
  width = 0.95
): [number, number] {
  const posterior = posteriorDistribution(n, k)
  const alpha = (1 - width) / 2
  
  return [
    posterior.inv(alpha),      // Lower bound
    posterior.inv(1 - alpha)   // Upper bound
  ]
}
```

#### Highest Posterior Density (HPD) Interval

The smallest interval containing 95% of the posterior probability.

```typescript
/**
 * Compute HPD interval using numerical optimization.
 * More complex but provides tighter intervals.
 */
function hpdInterval(
  n: number,
  k: number,
  width = 0.95
): [number, number] {
  const posterior = posteriorDistribution(n, k)
  const alpha = 1 - width
  
  // For symmetric posteriors, HPD equals equal-tailed
  // For skewed posteriors, HPD is shorter
  
  // Numerical search for optimal interval
  let bestLower = 0
  let bestWidth = 1
  
  const steps = 1000
  for (let i = 0; i <= steps; i++) {
    const lower = i / steps * alpha
    const l = posterior.inv(lower)
    const u = posterior.inv(lower + width)
    
    if (u - l < bestWidth) {
      bestLower = l
      bestWidth = u - l
    }
  }
  
  return [bestLower, bestLower + bestWidth]
}
```

### Examples

For n = 1000 tests, k = 0 failures:

```
Posterior: Beta(1001, 1)

Equal-tailed 95% CI: [0.9970, 1.0000]
HPD 95% CI:          [0.9970, 1.0000]

Interpretation: We are 95% confident the true success rate
is between 99.70% and 100%.
```

For n = 1000 tests, k = 5 failures:

```
Posterior: Beta(996, 6)

Equal-tailed 95% CI: [0.9926, 0.9979]
HPD 95% CI:          [0.9927, 0.9980]

Interpretation: We are 95% confident the true success rate
is between 99.26% and 99.79%.
```

## 3. Confidence-Based Stopping Rules

### Basic Stopping Rule

Stop testing when:
```
P(θ > 1 - ε | data) ≥ target_confidence
```

Where:
- ε is the acceptable failure rate (e.g., 10^-6)
- target_confidence is the user-specified confidence level (e.g., 0.99)

### Implementation

```typescript
interface StoppingCriteria {
  targetConfidence: number
  epsilon: number
  maxTests: number
}

function shouldContinueTesting(
  testsRun: number,
  failures: number,
  criteria: StoppingCriteria
): { continue: boolean; reason: string; confidence: number } {
  // Stop if we found a failure
  if (failures > 0) {
    return {
      continue: false,
      reason: 'counterexample_found',
      confidence: 0
    }
  }
  
  // Stop if reached max tests
  if (testsRun >= criteria.maxTests) {
    const conf = calculateConfidence(testsRun, 0, criteria.epsilon)
    return {
      continue: false,
      reason: 'max_tests_reached',
      confidence: conf
    }
  }
  
  // Calculate current confidence
  const confidence = calculateConfidence(testsRun, 0, criteria.epsilon)
  
  if (confidence >= criteria.targetConfidence) {
    return {
      continue: false,
      reason: 'confidence_achieved',
      confidence
    }
  }
  
  return {
    continue: true,
    reason: 'insufficient_confidence',
    confidence
  }
}
```

### Adaptive Batch Sizes

To avoid checking after every single test, use increasing batch sizes:

```typescript
function getNextBatchSize(testsRun: number): number {
  // Start small, grow exponentially, cap at 1000
  if (testsRun < 100) return 10
  if (testsRun < 1000) return 100
  return 1000
}
```

## 4. Coverage Verification Statistics

### Wilson Score Interval

For coverage requirements, we use the Wilson score interval, which performs well for proportions:

```typescript
/**
 * Wilson score confidence interval for a proportion.
 * Better than normal approximation for small samples and extreme proportions.
 */
function wilsonScoreInterval(
  successes: number,
  total: number,
  confidence = 0.95
): [number, number] {
  const z = normalQuantile((1 + confidence) / 2)  // e.g., 1.96 for 95%
  const p = successes / total
  const n = total
  
  const denominator = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denominator
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator
  
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin)
  ]
}

/**
 * Check if a coverage requirement is satisfied with statistical confidence.
 */
function coverageRequirementSatisfied(
  observed: number,      // Tests satisfying condition
  total: number,         // Total tests
  required: number,      // Required percentage (0-100)
  confidence = 0.95
): { satisfied: boolean; interval: [number, number] } {
  const interval = wilsonScoreInterval(observed, total, confidence)
  
  // Requirement is satisfied if lower bound of CI exceeds required percentage
  return {
    satisfied: interval[0] * 100 >= required,
    interval: [interval[0] * 100, interval[1] * 100]
  }
}
```

### Sequential Coverage Testing

For `checkCoverage()`, we use sequential testing to continue until coverage is verified:

```typescript
interface CoverageRequirement {
  label: string
  percentage: number
  predicate: (args: unknown) => boolean
  count: number  // Running count of satisfying tests
}

function checkCoverageRequirements(
  requirements: CoverageRequirement[],
  totalTests: number,
  confidence: number
): { allSatisfied: boolean; results: CoverageResult[] } {
  const results: CoverageResult[] = []
  let allSatisfied = true
  
  for (const req of requirements) {
    const check = coverageRequirementSatisfied(
      req.count,
      totalTests,
      req.percentage,
      confidence
    )
    
    results.push({
      label: req.label,
      requiredPercentage: req.percentage,
      observedPercentage: (req.count / totalTests) * 100,
      count: req.count,
      satisfied: check.satisfied,
      confidenceInterval: check.interval
    })
    
    if (!check.satisfied) allSatisfied = false
  }
  
  return { allSatisfied, results }
}
```

## 5. Interaction with Shrinking

### Problem

When confidence-based testing finds a failure and starts shrinking:
1. Should we update our confidence estimate?
2. Should shrinking affect the test count?

### Recommendation

**Separate shrinking from confidence calculation:**

```typescript
interface TestExecution {
  // Phase 1: Discovery
  discoveryPhase: {
    testsRun: number
    testsPassed: number
    confidence: number
    credibleInterval: [number, number]
  }
  
  // Phase 2: Shrinking (only if failure found)
  shrinkingPhase?: {
    shrinkAttempts: number
    minimalCounterexample: unknown
  }
}
```

**Rationale:**
- Confidence represents belief about the property on the full input space
- Shrinking is a deterministic search for a smaller counterexample
- They serve different purposes and shouldn't be conflated

### Confidence After Failure

Once a counterexample is found:
- Confidence that property holds for ALL inputs = 0
- We can still report: "Property failed on 1 of n tests"
- Credible interval for failure rate can still be computed

## 6. Edge Cases

### No Tests Run

```typescript
if (n === 0) {
  return {
    confidence: 0,
    credibleInterval: [0, 1],  // Complete uncertainty
    message: 'No tests executed'
  }
}
```

### All Tests Failed

```typescript
if (k === n) {
  return {
    confidence: 0,
    credibleInterval: [0, 0.05],  // High certainty of failure
    message: 'Property failed on all test cases'
  }
}
```

### High Discard Rate

When many generated values are filtered out:

```typescript
const effectiveSampleSize = testsRun - testsDiscarded

if (testsDiscarded / testsRun > 0.5) {
  // Warning: more than half of tests were discarded
  console.warn(`High discard rate: ${(testsDiscarded / testsRun * 100).toFixed(1)}%`)
  console.warn('Consider adjusting generators or preconditions')
}

// Confidence should be based on effective sample size
const confidence = calculateConfidence(effectiveSampleSize, failures)
```

### Very Small Sample Sizes

For n < 10, confidence intervals are wide and confidence is low:

```typescript
if (testsRun < 10) {
  console.warn('Sample size too small for meaningful confidence calculation')
  return {
    confidence: undefined,
    credibleInterval: undefined,
    message: 'Insufficient data for statistical inference'
  }
}
```

### Numerical Precision

For very large n or extreme confidence levels:

```typescript
// Use log-space calculations for numerical stability
function logConfidence(n: number, epsilon: number): number {
  // log(P(θ > 1 - ε)) for Beta(n+1, 1)
  // ≈ n * log(1 - ε) for large n
  return n * Math.log(1 - epsilon)
}

// Only convert to probability when needed
function safeConfidence(n: number, epsilon: number): number {
  const logConf = logConfidence(n, epsilon)
  if (logConf > -1e-10) return 1  // Effectively 1
  if (logConf < -700) return 0    // Underflow protection
  return Math.exp(logConf)
}
```

## 7. Performance Considerations

### Statistics Collection Overhead

| Operation | Time Complexity | Memory |
|-----------|-----------------|--------|
| Label counting | O(1) per test | O(labels) |
| Coverage tracking | O(requirements) per test | O(requirements) |
| Confidence calculation | O(1) | O(1) |
| Credible interval | O(1) | O(1) |
| Distribution tracking | O(log n) | O(1) streaming |

### Recommendations

1. **Basic stats**: Always collect (negligible overhead)
   - testsRun, testsPassed, testsDiscarded, executionTimeMs

2. **Label stats**: Collect when classify/label used
   - Use Map for O(1) insertion and lookup

3. **Confidence stats**: Calculate on demand
   - Only compute when result is requested

4. **Detailed arbitrary stats**: Opt-in only
   - Distribution tracking requires streaming quantile algorithms
   - Use reservoir sampling for memory efficiency

## 8. Prior Distribution Recommendations

### Default: Uniform Prior Beta(1, 1)

**Pros:**
- Non-informative
- Simple to explain
- Conservative estimates

**Cons:**
- May require more tests for high confidence

### For High-Assurance Systems: Jeffrey's Prior Beta(0.5, 0.5)

**Pros:**
- Maximum entropy
- Slightly faster confidence buildup
- Standard in Bayesian statistics

**Cons:**
- Slightly more complex to explain

### User-Configurable Priors

For advanced users, allow specifying priors:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.99)
    .withPrior({ alpha: 0.5, beta: 0.5 }))  // Jeffrey's prior
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

## Summary

| Concept | Formula/Method |
|---------|---------------|
| Posterior distribution | Beta(α + n - k, β + k) with uniform prior Beta(1,1) |
| Confidence | P(θ > 1 - ε) = 1 - Beta.cdf(1 - ε) |
| Credible interval | [Beta.inv(α/2), Beta.inv(1 - α/2)] |
| Coverage verification | Wilson score interval lower bound ≥ requirement |
| Stopping rule | Continue until confidence ≥ target or maxTests reached |

## References

1. Gelman, A. et al. "Bayesian Data Analysis" (3rd ed., 2013)
2. Murphy, K. "Machine Learning: A Probabilistic Perspective" (2012)
3. Wilson, E. B. "Probable Inference, the Law of Succession, and Statistical Inference" (1927)
4. Claessen, K. and Hughes, J. "QuickCheck Testing for Fun and Profit" (2000)
