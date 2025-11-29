# Mathematical Analysis: Filter Arbitrary Size Estimation

> **Related Issue:** [#9](https://github.com/fluent-check/fluent-check/issues/9) - Decide if there is room for improvement in the filter arbitrary size estimation

## Problem Statement

Given a filtered arbitrary `baseArbitrary.filter(predicate)`, estimate the size of the filtered domain using Bayesian inference.

**Current implementation uses Beta distribution:**
```typescript
return this.baseArbitrary.mapArbitrarySize(v =>
    ({ type: 'estimated',
      value: Math.round(v * this.sizeEstimation.mode()),
      credibleInterval: [
        v * this.sizeEstimation.inv(lowerCredibleInterval), 
        v * this.sizeEstimation.inv(upperCredibleInterval)
      ] 
    }))
```

**Issues identified:**
1. Using `mode()` for point estimate, but percentiles for credible interval
2. Point estimate can fall outside credible interval for skewed distributions
3. Beta distribution assumes continuous proportion, but domain is discrete

## Mathematical Framework

### Setup

Let:
- $n$ = base arbitrary size (known or estimated)
- $p$ = true proportion of values passing the filter (unknown)
- $k$ = number of samples tested
- $s$ = number of samples that passed the filter
- $\hat{m} = n \cdot \hat{p}$ = estimated filtered size

### Bayesian Model

**Prior:** $p \sim \text{Beta}(\alpha_0, \beta_0)$

With uninformative prior $\alpha_0 = \beta_0 = 1$ (uniform on [0,1]).

**Likelihood:** $s | p, k \sim \text{Binomial}(k, p)$

**Posterior:** $p | s, k \sim \text{Beta}(\alpha_0 + s, \beta_0 + k - s)$

After observing $s$ successes in $k$ trials:
$$p | s, k \sim \text{Beta}(1 + s, 1 + k - s)$$

## Issue 1: Point Estimator Choice

### The Three Common Estimators

| Estimator | Formula | Loss Function | Beta Distribution |
|-----------|---------|---------------|-------------------|
| **Mean** | $\frac{\alpha}{\alpha + \beta}$ | Squared error (L2) | $\frac{1+s}{2+k}$ |
| **Median** | $\text{inv}(0.5)$ | Absolute error (L1) | ≈ $\frac{s + 1/3}{k + 2/3}$ |
| **Mode** | $\frac{\alpha - 1}{\alpha + \beta - 2}$ | 0-1 loss (MAP) | $\frac{s}{k}$ (if $s, k-s \geq 1$) |

### Analysis

**Mode (current implementation):**
- Equals the MLE $\hat{p} = s/k$ for $\alpha, \beta > 1$
- Undefined for $\alpha = 1$ or $\beta = 1$ (boundary cases)
- Can be at 0 or 1 for sparse data
- NOT guaranteed to be inside equal-tailed credible interval

**Mean:**
- Always defined
- Shrinks toward 0.5 (regularization effect)
- Minimizes expected squared error
- Always inside [0,1]

**Median:**
- Always inside the credible interval by construction
- Minimizes expected absolute error
- Good for asymmetric loss functions
- Approximation: $\frac{s + 1/3}{k + 2/3}$ (quantile matching)

### Recommendation: Use Median

For size estimation, the median is preferred because:

1. **Consistency:** Median is always inside the credible interval
2. **Robustness:** Less sensitive to outliers than mean
3. **Interpretability:** "50% chance the true value is above/below this"

```typescript
// Recommended change
value: Math.round(v * this.sizeEstimation.median())
// or equivalently
value: Math.round(v * this.sizeEstimation.inv(0.5))
```

## Issue 2: Credible Interval Consistency

### Current Problem

Using mode for point estimate but percentiles for interval:

```typescript
value: Math.round(v * this.sizeEstimation.mode()),           // Can be 0
credibleInterval: [
  v * this.sizeEstimation.inv(0.025),                        // Always > 0
  v * this.sizeEstimation.inv(0.975)
]
```

For $\text{Beta}(1, 10)$ (observed 0 successes in 9 trials):
- Mode = 0 (at boundary)
- 2.5th percentile ≈ 0.003
- 97.5th percentile ≈ 0.28

**Result:** Point estimate (0) is outside the credible interval!

### Solutions

**Option A: Use median consistently**
```typescript
value: Math.round(v * this.sizeEstimation.inv(0.5)),
credibleInterval: [
  v * this.sizeEstimation.inv(0.025), 
  v * this.sizeEstimation.inv(0.975)
]
```

**Option B: Use Highest Posterior Density (HPD) interval**

HPD interval contains the mode and has shortest length for given coverage:
```typescript
// HPD for Beta distribution
function hpdInterval(alpha: number, beta: number, coverage: number): [number, number] {
  // Optimization to find shortest interval with given coverage
  // For unimodal distributions, this always contains the mode
}
```

**Option C: Report mode with HPD interval**
```typescript
value: Math.round(v * this.sizeEstimation.mode()),
credibleInterval: this.sizeEstimation.hpdInterval(0.95)
```

### Recommendation: Option A (Median + Equal-tailed)

Simplest, always consistent, widely understood.

## Issue 3: Beta vs Beta-Binomial

### When Beta is Appropriate

Beta models a continuous proportion $p \in [0, 1]$.

**Use Beta when:**
- Base size $n$ is unknown or very large
- We care about the proportion $p$, not the count $m = np$

### When Beta-Binomial is Better

Beta-Binomial models a discrete count $m \in \{0, 1, ..., n\}$ when $n$ is known.

$$m | n, \alpha, \beta \sim \text{BetaBinomial}(n, \alpha, \beta)$$

**Use Beta-Binomial when:**
- Base size $n$ is exactly known
- We want the filtered count $m$ directly
- $n$ is small enough that discreteness matters

### Comparison

| Aspect | Beta | Beta-Binomial |
|--------|------|---------------|
| Output | Proportion $p \in [0,1]$ | Count $m \in \{0,...,n\}$ |
| Base size | Any (even unknown) | Must be known exactly |
| Support | Continuous | Discrete |
| Variance | Lower (ignores $n$ uncertainty) | Higher (accounts for discrete sampling) |

### Mathematical Relationship

If $p \sim \text{Beta}(\alpha, \beta)$ and $m | p \sim \text{Binomial}(n, p)$, then:
$$m \sim \text{BetaBinomial}(n, \alpha, \beta)$$

The Beta-Binomial is the **marginal distribution** of $m$ after integrating out $p$.

### When Does It Matter?

For large $n$, the difference is negligible. For small $n$:

| n | Beta CI for $m$ | Beta-Binomial CI |
|---|-----------------|------------------|
| 10 | [1.2, 8.7] | [1, 9] |
| 100 | [12, 87] | [12, 87] |
| 1000 | [123, 876] | [123, 876] |

**Rule of thumb:** Use Beta-Binomial when $n < 100$ and exact $n$ is known.

### Implementation

```typescript
size(): ArbitrarySize {
  const baseSize = this.baseArbitrary.size()
  
  if (baseSize.type === 'exact' && baseSize.value < 100) {
    // Use Beta-Binomial for small exact domains
    const dist = new BetaBinomialDistribution(
      baseSize.value,
      1 + this.successes,
      1 + this.failures
    )
    return {
      type: 'estimated',
      value: dist.median(),
      credibleInterval: [dist.inv(0.025), dist.inv(0.975)]
    }
  } else {
    // Use Beta for large or estimated domains
    const dist = new BetaDistribution(1 + this.successes, 1 + this.failures)
    const n = baseSize.value
    return {
      type: 'estimated',
      value: Math.round(n * dist.inv(0.5)),
      credibleInterval: [
        Math.round(n * dist.inv(0.025)),
        Math.round(n * dist.inv(0.975))
      ]
    }
  }
}
```

## Summary of Recommendations

| Issue | Current | Recommended |
|-------|---------|-------------|
| Point estimator | `mode()` | `inv(0.5)` (median) |
| Interval type | Equal-tailed percentiles | Keep (consistent with median) |
| Distribution | Always Beta | Beta-Binomial when $n < 100$ and exact |

## Credible Interval Width Analysis

For planning sample sizes, the expected width of a 95% CI for proportion $p$:

$$\text{Width} \approx \frac{4}{\sqrt{k}}$$

For $k$ samples, expected CI width for filtered size $m$:

$$\text{Width}_m \approx n \cdot \frac{4}{\sqrt{k}}$$

**Sample size to achieve width $w$:**
$$k \approx \frac{16n^2}{w^2}$$

## Open Questions

1. **Adaptive sampling:** Should we sample more when CI is too wide?

2. **Conjugate updates:** Can we incrementally update the estimate as more samples are tested?

3. **Correlated filters:** How to handle `filter(f).filter(g)` - are failures from $f$ informative about $g$?

4. **Zero successes:** Special handling when $s = 0$ (no samples pass)?
   - Current: Mode = 0, but CI excludes 0
   - Recommendation: Use median ≈ $0.5/(k+1)$

## References

- Gelman, A., et al. (2013). Bayesian Data Analysis, 3rd Edition
- Agresti, A., & Coull, B. A. (1998). Approximate is better than "exact" for interval estimation of binomial proportions

## Next Steps

- [ ] Change point estimator from mode to median
- [ ] Add Beta-Binomial for small exact domains
- [ ] Benchmark CI coverage with simulations
- [ ] Consider HPD intervals as alternative
- [ ] Handle edge cases (s=0, s=k)
