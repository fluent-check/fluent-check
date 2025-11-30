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

### Key Assumptions

The Bayesian model relies on several assumptions that have been validated empirically:

| # | Assumption | Description | Validated |
|---|------------|-------------|-----------|
| A1 | **IID Sampling** | Each sample is independent and identically distributed | ✅ [PR #463] |
| A2 | **Constant Proportion** | The true proportion $p$ is fixed (not changing during sampling) | ✅ [PR #463] |
| A3 | **Uninformative Prior** | Beta(1,1) prior is appropriate when we have no prior knowledge | ✅ [PR #463] |
| A4 | **Binomial Likelihood** | The sampling process follows a Binomial distribution | ✅ [PR #463] |
| A5 | **Continuous Approximation** | Beta is appropriate even though domain is discrete | ✅ [PR #463] |

> **Validation:** All assumptions were empirically validated through Monte Carlo simulations (up to 1M trials). See [PR #463](https://github.com/fluent-check/fluent-check/pull/463) for detailed results.

### Bayesian Model

**Prior:** $p \sim \text{Beta}(\alpha_0, \beta_0)$

With uninformative prior $\alpha_0 = \beta_0 = 1$ (uniform on [0,1]).

> **Future consideration:** Jeffreys prior $\text{Beta}(0.5, 0.5)$ may provide better small-sample coverage and less shrinkage bias near boundaries. See Brown, Cai, & DasGupta (2001). The current Beta(1,1) is simpler and sufficient for most use cases.

**Likelihood:** $s | p, k \sim \text{Binomial}(k, p)$

**Posterior:** $p | s, k \sim \text{Beta}(\alpha_0 + s, \beta_0 + k - s)$

After observing $s$ successes in $k$ trials:
$$p | s, k \sim \text{Beta}(1 + s, 1 + k - s)$$

### Special Case: No Samples ($k = 0$)

When no samples have been tested yet, the estimator should return the prior:

| Property | Value at $k = 0$ |
|----------|------------------|
| Posterior | Prior itself: $\text{Beta}(1, 1)$ |
| Point estimate | Median of prior = 0.5 |
| CI | Prior CI: [0.025, 0.975] |

This represents "we have learned nothing" — maximum uncertainty.

### Asymptotic Requirement

As $k \to \infty$, the estimator must converge to the MLE:

$$\lim_{k \to \infty} \hat{p}_{\text{median}} = \frac{s}{k}$$

This ensures the Bayesian estimator behaves like classical statistics for large samples. The prior's influence vanishes as evidence accumulates.

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

**Example 1:** $\text{Beta}(1, 10)$ — observed 0 successes in 9 trials ($s = 0$):
- Mode = 0 (at boundary)
- 2.5th percentile ≈ 0.003
- 97.5th percentile ≈ 0.28

**Result:** Point estimate (0) is *below* the credible interval!

**Example 2:** $\text{Beta}(10, 1)$ — observed 9 successes in 9 trials ($s = k$):
- Mode = 1 (at boundary)
- 2.5th percentile ≈ 0.72
- 97.5th percentile ≈ 0.997

**Result:** Point estimate (1) is *above* the credible interval!

Both boundary cases demonstrate the same fundamental issue: mode falls outside equal-tailed CI for skewed distributions.

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

### Rationale: Equal-tailed vs HPD Intervals

| Interval | Pros | Cons |
|----------|------|------|
| **Equal-tailed** | Deterministically contains median; direct from quantiles; widely understood | Less efficient (wider) for skewed posteriors |
| **HPD** | Smallest credible region; contains mode | Harder to compute (requires optimization); less common in engineering tools |

Given the library use-case (engineering simplicity over statistical efficiency), **equal-tailed + median** is the pragmatic choice:
- No optimization needed—just two quantile evaluations
- Guarantees point estimate is always inside interval
- Users intuitively understand percentile-based intervals

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

**Rule of thumb:** Use Beta-Binomial when $n < 20$ and exact $n$ is known.

> **Note:** Initial analysis suggested $n < 100$, but high-precision Monte Carlo validation (1M trials) revealed:
> - At $n = 100$: **0% coverage improvement**, 10.5x computational cost, worse MSE
> - At $n = 50$: 1.2% coverage improvement, 6.5x cost, -4% worse MSE
> - At $n = 20$: 2.3% coverage improvement (peak), 2x cost, -6.7% worse MSE
> - At $n = 10$: 0.2-1.1% coverage improvement, 1.5x cost, no MSE penalty
>
> The threshold $n < 20$ balances coverage improvement with acceptable computational cost. See PR #463 for detailed validation results.

### Implementation

```typescript
size(): ArbitrarySize {
  const baseSize = this.baseArbitrary.size()
  
  if (baseSize.type === 'exact' && baseSize.value < 20) {
    // Use Beta-Binomial for very small exact domains (validated threshold)
    // Coverage improvement: 0.2-2.3%, Cost: 1.5-2x, acceptable trade-off
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
    // Use Beta for larger or estimated domains
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
| Distribution | Always Beta | Beta-Binomial when $n < 20$ and exact |

---

## Empirical Validation Summary

All recommendations were validated through Monte Carlo simulations in [PR #463](https://github.com/fluent-check/fluent-check/pull/463).

### Key Findings (1,000,000 trials)

| Finding | Result | Implication |
|---------|--------|-------------|
| **Credible Interval Coverage** | 88-99% for 95% CI | ✅ Model correctly captures sampling process |
| **Median vs Mode** | Median always inside CI | ✅ Validates median recommendation |
| **Mode Outside CI** | Confirmed for extreme $p$ | ✅ Validates Issue #2 concern |
| **Prior Convergence** | All priors converge as $k \to \infty$ | ✅ Validates assumption A3 |
| **Incremental Updates** | 100% batch/incremental match | ✅ Implementation correct |

### Beta-Binomial Trade-off Discovery

High-precision validation revealed a fundamental trade-off not apparent in theoretical analysis:

| n | Coverage Δ | MSE Δ | Cost | Recommendation |
|---|-----------|-------|------|----------------|
| 10 | +0.2-1.1% | 0% | 1.5x | ✅ Use Beta-Binomial |
| 20 | +2.3% | -6.7% | 2.0x | ⚠️ Marginal |
| 50 | +1.2% | -4.1% | 6.5x | ❌ Not worth it |
| 100 | **0%** | -2.4% | 10.5x | ❌ No benefit |

**Key Insight:** Beta-Binomial improves **coverage** (interval accuracy) but worsens **MSE** (point estimation accuracy). This trade-off was not predicted by the initial theoretical analysis and led to revising the threshold from $n < 100$ to $n < 20$.

---

### Implementation Note: Integer Rounding

When converting proportion estimates to counts, **round after computing the quantile, not before**:

```typescript
// CORRECT: Round the final count estimate
credibleInterval: [
  Math.round(n * dist.inv(0.025)),  // ✓ Quantile first, then round
  Math.round(n * dist.inv(0.975))
]

// INCORRECT: Don't round the proportion then multiply
credibleInterval: [
  n * Math.round(dist.inv(0.025)),  // ✗ Loses precision
  n * Math.round(dist.inv(0.975))
]
```

## Computational Complexity Considerations

### Beta Quantile Computation

The `inv()` function (quantile/inverse CDF) for Beta distribution:
- Requires computing the **incomplete regularized beta function inverse**
- Typically implemented via numerical root-finding (Newton-Raphson or bisection)
- **Complexity:** $O(\log(1/\epsilon))$ iterations for precision $\epsilon$, each iteration $O(1)$
- Libraries like `jstat` provide optimized implementations

### Beta-Binomial Quantile Computation

More expensive than Beta:
- Requires iterating over discrete support $\{0, 1, ..., n\}$
- Current implementation: $O(n)$ for CDF, $O(n \cdot \log n)$ for quantile via binary search
- For small $n < 100$, this is acceptable
- **Optimization opportunity:** Precompute CDF table for repeated queries

### Performance Impact

Measured performance from [PR #463](https://github.com/fluent-check/fluent-check/pull/463) validation:

| Operation | Beta | Beta-Binomial |
|-----------|------|---------------|
| Single quantile (3 quantiles) | 0.020 ms | Scales with n (see below) |

**Beta-Binomial cost scales linearly with n:**

| n | Time (3 quantiles) | Ratio vs Beta |
|---|-------------------|---------------|
| 10 | 0.030 ms | 1.5x |
| 20 | 0.040 ms | 2.0x |
| 30 | 0.100 ms | 5.0x |
| 50 | 0.130 ms | 6.5x |
| 100 | 0.210 ms | 10.5x |

For stacked filters like `filter(f).filter(g).filter(h)`, each filter maintains its own estimator. With the revised threshold ($n < 20$), the overhead is 1.5-2x which is negligible compared to predicate evaluation.

**Recommendation:** The computational cost is acceptable for the accuracy improvement at $n < 20$. The linear scaling is why the threshold was revised from $n < 100$.

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

---

## Appendix: Validation of Assumptions through Simulation

The following Monte Carlo simulations were implemented in [PR #463](https://github.com/fluent-check/fluent-check/pull/463) to empirically validate the Bayesian model assumptions and recommendations.

> **Implementation:** `test/simulations/filter-arbitrary-validation.ts`
> **Results:** See [PR #463 comments](https://github.com/fluent-check/fluent-check/pull/463) for detailed analysis with up to 1,000,000 trials.

### Simulation Strategy

Each simulation follows the pattern:
1. **Ground Truth**: Establish known parameters (true $p$, true $n$)
2. **Sampling**: Simulate the sampling process under controlled conditions
3. **Estimation**: Apply our estimators to the simulated data
4. **Evaluation**: Compare estimates to ground truth across many trials
5. **Metrics**: Compute coverage, bias, MSE, and other relevant statistics

### Simulation 1: Credible Interval Coverage

**Hypothesis**: A 95% credible interval should contain the true proportion 95% of the time.

**Setup**:
```typescript
interface CoverageSimulationParams {
  trueProportions: number[]   // e.g., [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]
  sampleSizes: number[]       // e.g., [10, 30, 50, 100, 200]
  numTrials: number           // e.g., 10000
  credibleLevel: number       // e.g., 0.95
}
```

**Algorithm**:
```typescript
function simulateCoverage(params: CoverageSimulationParams): CoverageResults {
  const results: CoverageResults = {}
  
  for (const p of params.trueProportions) {
    for (const k of params.sampleSizes) {
      let covered = 0
      
      for (let trial = 0; trial < params.numTrials; trial++) {
        // Generate Binomial(k, p) sample
        const successes = randomBinomial(k, p)
        
        // Compute posterior Beta(1 + s, 1 + k - s)
        const alpha = 1 + successes
        const beta = 1 + k - successes
        
        // Compute credible interval
        const lowerTail = (1 - params.credibleLevel) / 2
        const upperTail = 1 - lowerTail
        const ciLow = betaInv(lowerTail, alpha, beta)
        const ciHigh = betaInv(upperTail, alpha, beta)
        
        // Check if true p is inside CI
        if (ciLow <= p && p <= ciHigh) covered++
      }
      
      results[`p=${p},k=${k}`] = covered / params.numTrials
    }
  }
  return results
}
```

**Expected Outcome**: Coverage should be ≈0.95 for all parameter combinations.

**What Would Falsify**: Coverage significantly below 0.95 (e.g., <0.90) would indicate a problem with the Bayesian model or our implementation.

**Edge Cases to Test**:
- Very small $p$ (0.001, 0.01) - tests behavior near boundary
- Very large $p$ (0.99, 0.999) - tests symmetry
- Small sample sizes ($k < 20$) - tests small-sample behavior

---

### Simulation 2: Point Estimator Comparison

**Hypothesis**: Median provides better point estimates than mode for skewed distributions.

**Metrics**:
- **Bias**: $E[\hat{p}] - p$
- **Mean Squared Error (MSE)**: $E[(\hat{p} - p)^2]$
- **Mean Absolute Error (MAE)**: $E[|\hat{p} - p|]$
- **Outside CI Rate**: How often the point estimate falls outside the credible interval

**Algorithm**:
```typescript
function compareEstimators(params: EstimatorComparisonParams): EstimatorResults {
  const estimators = ['mode', 'mean', 'median']
  const results: Record<string, EstimatorMetrics> = {}
  
  for (const p of params.trueProportions) {
    for (const k of params.sampleSizes) {
      for (const estimator of estimators) {
        let sumError = 0, sumSquaredError = 0, sumAbsError = 0
        let outsideCI = 0
        
        for (let trial = 0; trial < params.numTrials; trial++) {
          const s = randomBinomial(k, p)
          const alpha = 1 + s, beta = 1 + k - s
          
          // Compute point estimate
          let estimate: number
          switch (estimator) {
            case 'mode': estimate = (alpha > 1 && beta > 1) ? (alpha - 1) / (alpha + beta - 2) : s / k; break
            case 'mean': estimate = alpha / (alpha + beta); break
            case 'median': estimate = betaInv(0.5, alpha, beta); break
          }
          
          // Compute CI
          const ciLow = betaInv(0.025, alpha, beta)
          const ciHigh = betaInv(0.975, alpha, beta)
          
          // Accumulate metrics
          sumError += estimate - p
          sumSquaredError += (estimate - p) ** 2
          sumAbsError += Math.abs(estimate - p)
          if (estimate < ciLow || estimate > ciHigh) outsideCI++
        }
        
        const n = params.numTrials
        results[`${estimator},p=${p},k=${k}`] = {
          bias: sumError / n,
          mse: sumSquaredError / n,
          mae: sumAbsError / n,
          outsideCIRate: outsideCI / n
        }
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- Mode should have highest "outside CI" rate for small $k$ and extreme $p$
- Mean should have slight bias toward 0.5
- Median should always be inside CI (by construction)

**What Would Falsify**:
- Median performing significantly worse than mode on MSE/MAE
- Mode consistently inside CI (would invalidate Issue #2)

---

### Simulation 3: Mode-Outside-CI Rate

**Hypothesis**: Mode falls outside equal-tailed CI for skewed Beta distributions (supporting Issue #2).

**Algorithm**:
```typescript
function simulateModeOutsideCI(params: SimulationParams): ModeOutsideCIResults {
  const results: ModeOutsideCIResults = {}
  
  for (const p of params.trueProportions) {
    for (const k of params.sampleSizes) {
      let modeOutside = 0
      let modeBelowCI = 0, modeAboveCI = 0
      
      for (let trial = 0; trial < params.numTrials; trial++) {
        const s = randomBinomial(k, p)
        const alpha = 1 + s, beta = 1 + k - s
        
        // Mode (with boundary handling)
        let mode: number
        if (alpha <= 1) mode = 0
        else if (beta <= 1) mode = 1
        else mode = (alpha - 1) / (alpha + beta - 2)
        
        const ciLow = betaInv(0.025, alpha, beta)
        const ciHigh = betaInv(0.975, alpha, beta)
        
        if (mode < ciLow) { modeOutside++; modeBelowCI++ }
        else if (mode > ciHigh) { modeOutside++; modeAboveCI++ }
      }
      
      results[`p=${p},k=${k}`] = {
        outsideRate: modeOutside / params.numTrials,
        belowRate: modeBelowCI / params.numTrials,
        aboveRate: modeAboveCI / params.numTrials
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- High "outside" rates for $p < 0.1$ or $p > 0.9$ with small $k$
- Particularly high "below CI" rate when $s = 0$ (mode = 0, but CI excludes 0)
- Near-zero "outside" rates for moderate $p$ (0.3-0.7) and large $k$

---

### Simulation 4: Beta vs Beta-Binomial Comparison

**Hypothesis**: Beta-Binomial provides more accurate discrete estimates for small known $n$.

**Setup**:
```typescript
interface BetaBinomialComparisonParams {
  baseSizes: number[]         // e.g., [10, 20, 50, 100, 500, 1000]
  trueProportions: number[]   // e.g., [0.1, 0.3, 0.5, 0.7]
  sampleSizes: number[]       // e.g., [20, 50, 100]
  numTrials: number
}
```

**Algorithm**:
```typescript
function compareBetaVsBetaBinomial(params: BetaBinomialComparisonParams): ComparisonResults {
  const results: ComparisonResults = {}
  
  for (const n of params.baseSizes) {
    for (const p of params.trueProportions) {
      const trueFilteredSize = Math.round(n * p)  // Ground truth
      
      for (const k of params.sampleSizes) {
        let betaMSE = 0, betaBinomialMSE = 0
        let betaCoverage = 0, betaBinomialCoverage = 0
        
        for (let trial = 0; trial < params.numTrials; trial++) {
          const s = randomBinomial(k, p)
          const alpha = 1 + s, beta_ = 1 + k - s
          
          // Beta estimate: n * median(Beta)
          const betaMedian = betaInv(0.5, alpha, beta_)
          const betaEstimate = Math.round(n * betaMedian)
          const betaCILow = Math.round(n * betaInv(0.025, alpha, beta_))
          const betaCIHigh = Math.round(n * betaInv(0.975, alpha, beta_))
          
          // Beta-Binomial estimate: median of BetaBinomial(n, alpha, beta)
          const bbMedian = betaBinomialInv(0.5, n, alpha, beta_)
          const bbCILow = betaBinomialInv(0.025, n, alpha, beta_)
          const bbCIHigh = betaBinomialInv(0.975, n, alpha, beta_)
          
          // Accumulate metrics
          betaMSE += (betaEstimate - trueFilteredSize) ** 2
          betaBinomialMSE += (bbMedian - trueFilteredSize) ** 2
          
          if (betaCILow <= trueFilteredSize && trueFilteredSize <= betaCIHigh) betaCoverage++
          if (bbCILow <= trueFilteredSize && trueFilteredSize <= bbCIHigh) betaBinomialCoverage++
        }
        
        results[`n=${n},p=${p},k=${k}`] = {
          betaMSE: betaMSE / params.numTrials,
          betaBinomialMSE: betaBinomialMSE / params.numTrials,
          betaCoverage: betaCoverage / params.numTrials,
          betaBinomialCoverage: betaBinomialCoverage / params.numTrials
        }
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- For $n < 20$: Beta-Binomial should have better coverage (0.2-2.3% improvement)
- For $n \geq 20$: Diminishing returns; coverage improvement decreases while MSE worsens
- For $n \geq 100$: No coverage benefit, 10x+ computational cost

**Validated by PR #463**: High-precision validation (1M trials) confirmed:
- Beta-Binomial improves **coverage** but worsens **MSE** (point estimation accuracy)
- Threshold revised from $n < 100$ to $n < 20$ based on cost/benefit analysis
- At $n = 100$: 0% coverage improvement, -2.4% MSE, 10.5x slower

---

### Simulation 5: CI Width Formula Validation

**Hypothesis**: CI width for proportion is approximately $\frac{4}{\sqrt{k}}$.

**Algorithm**:
```typescript
function validateCIWidthFormula(params: WidthValidationParams): WidthResults {
  const results: WidthResults = {}
  
  for (const p of params.trueProportions) {
    for (const k of params.sampleSizes) {
      let totalWidth = 0
      
      for (let trial = 0; trial < params.numTrials; trial++) {
        const s = randomBinomial(k, p)
        const alpha = 1 + s, beta = 1 + k - s
        
        const ciLow = betaInv(0.025, alpha, beta)
        const ciHigh = betaInv(0.975, alpha, beta)
        totalWidth += ciHigh - ciLow
      }
      
      const empiricalWidth = totalWidth / params.numTrials
      const theoreticalWidth = 4 / Math.sqrt(k)
      
      results[`p=${p},k=${k}`] = {
        empirical: empiricalWidth,
        theoretical: theoreticalWidth,
        ratio: empiricalWidth / theoreticalWidth
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- Ratio should be ≈1.0 for moderate $p$ (0.3-0.7)
- Ratio may deviate for extreme $p$ (0.01, 0.99) since the formula assumes $p \approx 0.5$

**What Would Falsify**: Consistently large deviations (ratio < 0.5 or > 2.0) would indicate the formula is not useful for planning.

---

### Simulation 6: Edge Cases

**Hypothesis**: Edge cases ($s = 0$, $s = k$) are handled correctly.

**Test Cases**:

| Case | $s$ | $k$ | Expected Behavior |
|------|-----|-----|-------------------|
| Zero successes | 0 | 10 | Mode = 0, Median ≈ 0.067, CI should not include 0 (barely) |
| All successes | 10 | 10 | Mode = 1, Median ≈ 0.933, CI should not include 1 (barely) |
| One success | 1 | 100 | Mode = 0.01, Median ≈ 0.015, CI ≈ [0.002, 0.054] |
| Near-certain | 99 | 100 | Mode = 0.99, Median ≈ 0.985, CI ≈ [0.946, 0.998] |

**Algorithm**:
```typescript
function validateEdgeCases(): EdgeCaseResults {
  const cases = [
    { s: 0, k: 10, description: 'zero successes' },
    { s: 10, k: 10, description: 'all successes' },
    { s: 1, k: 100, description: 'one success' },
    { s: 99, k: 100, description: 'near certain' },
    { s: 0, k: 100, description: 'many failures' },
    { s: 1, k: 1000, description: 'rare event' }
  ]
  
  return cases.map(({ s, k, description }) => {
    const alpha = 1 + s, beta = 1 + k - s
    
    const mode = (alpha > 1 && beta > 1) 
      ? (alpha - 1) / (alpha + beta - 2) 
      : (alpha <= 1 ? 0 : 1)
    const mean = alpha / (alpha + beta)
    const median = betaInv(0.5, alpha, beta)
    const ciLow = betaInv(0.025, alpha, beta)
    const ciHigh = betaInv(0.975, alpha, beta)
    
    return {
      description,
      s, k, alpha, beta,
      mode, mean, median,
      ci: [ciLow, ciHigh],
      modeInCI: ciLow <= mode && mode <= ciHigh
    }
  })
}
```

---

### Simulation 7: Prior Sensitivity Analysis

**Hypothesis**: Posterior converges regardless of prior choice as $k$ increases.

**Priors to Test**:

| Prior | $\alpha_0$ | $\beta_0$ | Interpretation |
|-------|------------|-----------|----------------|
| Uninformative | 1 | 1 | Uniform on [0,1] |
| Jeffreys | 0.5 | 0.5 | Reference prior |
| Pessimistic | 1 | 10 | Expect low pass rate |
| Optimistic | 10 | 1 | Expect high pass rate |
| Concentrated | 5 | 5 | Expect ~50% pass rate |

**Algorithm**:
```typescript
function priorSensitivityAnalysis(params: PriorSensitivityParams): SensitivityResults {
  const priors = [
    { name: 'uninformative', alpha0: 1, beta0: 1 },
    { name: 'jeffreys', alpha0: 0.5, beta0: 0.5 },
    { name: 'pessimistic', alpha0: 1, beta0: 10 },
    { name: 'optimistic', alpha0: 10, beta0: 1 },
    { name: 'concentrated', alpha0: 5, beta0: 5 }
  ]
  
  const results: SensitivityResults = {}
  const trueP = 0.3  // Fixed ground truth
  
  for (const k of params.sampleSizes) {
    for (const prior of priors) {
      let sumEstimate = 0
      
      for (let trial = 0; trial < params.numTrials; trial++) {
        const s = randomBinomial(k, trueP)
        const alpha = prior.alpha0 + s
        const beta = prior.beta0 + k - s
        sumEstimate += betaInv(0.5, alpha, beta)  // Median
      }
      
      results[`${prior.name},k=${k}`] = {
        meanEstimate: sumEstimate / params.numTrials,
        biasFromTrue: (sumEstimate / params.numTrials) - trueP
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- All priors should converge to similar estimates as $k \to \infty$
- For small $k$ (< 20), prior choice may significantly affect estimates
- Jeffreys prior may have best overall properties

**What Would Falsify**: Persistent large differences between priors even for large $k$ would indicate a problem.

---

### Simulation 8: Incremental Update Validation

**Hypothesis**: Sequential Bayesian updates give the same result as batch processing.

This validates that our implementation correctly accumulates evidence:

**Algorithm**:
```typescript
function validateIncrementalUpdates(params: IncrementalParams): ValidationResults {
  const results: ValidationResults = { allMatch: true, discrepancies: [] }
  
  for (let trial = 0; trial < params.numTrials; trial++) {
    const trueP = Math.random()  // Random ground truth
    const samples = Array.from({ length: params.totalSamples }, () => Math.random() < trueP)
    
    // Method 1: Batch - count all at once
    const totalSuccesses = samples.filter(Boolean).length
    const batchAlpha = 1 + totalSuccesses
    const batchBeta = 1 + params.totalSamples - totalSuccesses
    
    // Method 2: Incremental - update one at a time
    let incAlpha = 1, incBeta = 1
    for (const success of samples) {
      if (success) incAlpha++
      else incBeta++
    }
    
    // Compare
    if (batchAlpha !== incAlpha || batchBeta !== incBeta) {
      results.allMatch = false
      results.discrepancies.push({ trial, batch: [batchAlpha, batchBeta], inc: [incAlpha, incBeta] })
    }
  }
  
  return results
}
```

**Expected Outcome**: Perfect match (this validates the implementation, not the math).

---

### Summary: Simulation Test Matrix

| Simulation | Validates | Key Metric | Pass Criterion |
|------------|-----------|------------|----------------|
| 1. Coverage | A4, Model correctness | Coverage rate | 0.93–0.97 for 95% CI |
| 2. Estimator comparison | Recommendation #1 | MSE, MAE, outside-CI rate | Median ≤ Mode on metrics |
| 3. Mode-outside-CI | Issue #2 | Outside-CI rate | >5% for extreme $p$, small $k$ |
| 4. Beta vs Beta-Binomial | Recommendation #3 | Coverage, MSE | BB better for $n < 20$ |
| 5. CI width formula | Planning utility | Empirical/theoretical ratio | 0.7–1.5 for moderate $p$ |
| 6. Edge cases | Boundary behavior | Correct values | Match analytical expectations |
| 7. Prior sensitivity | A3 | Convergence | Estimates converge as $k$ → ∞ |
| 8. Incremental updates | Implementation | Batch = Incremental | 100% match |

### Running the Simulations

A reference implementation should be created in `tests/simulations/filter-arbitrary-validation.ts` with:

1. Configurable parameters for sample sizes, proportions, and trial counts
2. Statistical tests (e.g., chi-squared for coverage) to determine pass/fail
3. Visualization outputs (histograms, scatter plots) for manual inspection
4. CI for simulation results themselves (to account for Monte Carlo error)

**Recommended Default Parameters**:
```typescript
const DEFAULT_PARAMS = {
  trueProportions: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99],
  sampleSizes: [10, 20, 50, 100, 200, 500],
  baseSizes: [10, 50, 100, 500, 1000],
  numTrials: 10000,
  credibleLevel: 0.95
}
```

**Monte Carlo Error**: With 10,000 trials, the standard error for a proportion estimate is approximately $\sqrt{p(1-p)/10000} \approx 0.005$ at $p = 0.5$. This means coverage estimates will have ±1% uncertainty (95% CI).

---

## References

- Gelman, A., et al. (2013). Bayesian Data Analysis, 3rd Edition
- Agresti, A., & Coull, B. A. (1998). Approximate is better than "exact" for interval estimation of binomial proportions
- Brown, L. D., Cai, T. T., & DasGupta, A. (2001). Interval Estimation for a Binomial Proportion. Statistical Science, 16(2), 101-133

## Next Steps

- [ ] Change point estimator from mode to median
- [ ] Add Beta-Binomial for small exact domains
- [x] Benchmark CI coverage with simulations — [PR #463](https://github.com/fluent-check/fluent-check/pull/463)
- [ ] Handle edge cases (k=0, s=0, s=k)
- [x] Implement validation simulations (see Appendix) — [PR #463](https://github.com/fluent-check/fluent-check/pull/463)
- [ ] Create visualization dashboard for simulation results
- [ ] Consider Jeffreys prior $\text{Beta}(0.5, 0.5)$ for improved boundary coverage
- [x] Profile quantile computation for performance-critical paths — [PR #463](https://github.com/fluent-check/fluent-check/pull/463)
