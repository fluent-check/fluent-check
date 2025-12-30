# Spec: Statistical Implementation Requirements (CI Calibration)

## Overview

This spec defines the implementation requirements for credible interval estimation in FilteredArbitrary and related classes, informed by the CI calibration evidence studies.

## FilteredArbitrary Requirements

### Beta Prior Selection

**Current Implementation**:
```typescript
this.sizeEstimation = new BetaDistribution(2, 1)
```

**MUST**:
1. Code comment MUST match implementation (currently says "1,1" but uses "2,1")
2. Prior choice MUST be justified with reference to Study A.4 results OR theoretical rationale
3. If using mode for point estimate, prior MUST have well-defined mode

**Options** (pending Study A.4 results):

**Option 1: Beta(2,1) - Current (if justified)**
```typescript
// Beta(2,1) prior ensures well-defined mode (mode=1.0)
// Optimistic bias toward high pass rates acceptable because:
// - Rare filters (low pass rate) terminate early anyway
// - Common filters (high pass rate) benefit from accurate estimation
// Reference: ci-calibration.md Study A.4, Beta prior comparison
this.sizeEstimation = new BetaDistribution(2, 1)
```

**Option 2: Beta(1,1) - Uniform prior**
```typescript
// Beta(1,1) = Uniform(0,1) prior (non-informative, no bias)
// Use mean for point estimate (mode is undefined for uniform)
// Reference: ci-calibration.md Study A.4, Beta prior comparison
this.sizeEstimation = new BetaDistribution(1, 1)

// In size() method:
Math.round(v * this.sizeEstimation.mean())  // not mode()
```

**Option 3: Beta(0.5,0.5) - Jeffreys prior**
```typescript
// Beta(0.5,0.5) = Jeffreys prior (reference prior for Bernoulli)
// Scale-invariant, no bias, well-defined mode (mode=0.5)
// Standard Bayesian choice for binomial inference
// Reference: Gelman et al. (2013), Chapter 2
this.sizeEstimation = new BetaDistribution(0.5, 0.5)
```

**Decision Process**:
1. Implement Study A.4 to compare priors empirically
2. Select based on: (a) coverage ≥85%, (b) lowest MAE, (c) narrowest width, (d) theoretical justification
3. Document choice in code with reference to study

### Warmup Sample Size

**Current Implementation**:
```typescript
const WARMUP_SAMPLES = 10
```

**MUST**:
1. Warmup count MUST be justified with reference to Study A.5 results
2. Tradeoff (speed vs accuracy) MUST be documented
3. Different warmup counts for different scenarios (constructor vs validation) MUST be explained

**Decision Process**:
1. Implement Study A.5 warmup recommendation analysis
2. Find minimum warmup w where: coverage ≥90%, MAE <20%, width <50%
3. If recommended w > 10: update constructor OR document rationale for keeping 10
4. Document in code:
```typescript
// Warmup sample count selected based on Study A.5 analysis
// Minimum for 90% coverage: <recommended_value>
// Current value: 10 (tradeoff: faster construction, acceptable for most cases)
// For critical applications, consider manual warmup before calling size()
const WARMUP_SAMPLES = 10
```

### Early Termination Logic

**Current Implementation**:
```typescript
while (baseSize * sizeEstimation.inv(upperCredibleInterval) >= 1)
```

**MUST**:
1. Document that `inv(upperCredibleInterval)` returns **rate** (Beta quantile), not size
2. Explain one-sided test (95th percentile for conservatism)
3. Handle edge case: when baseSize is EstimatedSize (use upper bound for conservatism)

**Required Documentation**:
```typescript
// Early termination: stop trying when 95th percentile of size estimate < 1
//
// sizeEstimation.inv(0.95) returns the 95th percentile of the pass rate (Beta quantile)
// This is a RATE (value between 0 and 1), not a size.
//
// We multiply: baseSize (count) × passRate (rate) = estimatedSize (count)
//
// Decision rule: If even the optimistic estimate (95th percentile) suggests size < 1,
// stop trying to find values.
//
// This is ONE-SIDED (conservative):
// - Uses 95th percentile (not 90% CI which would be 5th to 95th)
// - Biased toward continuing longer rather than stopping early
// - False positive rate: ≤5% (validated by Study B)
//
// Reference: ci-calibration-advanced.md Study B, Early Termination Correctness

const baseSize = this.baseArbitrary.size().value
// TODO: For conservatism when baseSize is estimated, use:
// const baseSize = this.baseArbitrary.size().type === 'estimated'
//   ? this.baseArbitrary.size().credibleInterval[1]  // upper bound
//   : this.baseArbitrary.size().value

while (baseSize * this.sizeEstimation.inv(upperCredibleInterval) >= 1) {
  // ... try to find values
}
```

**TODO Item** (from Study B edge case):
- [ ] Handle estimated base sizes conservatively (use upper CI bound)

### Size Estimation Method

**Current Implementation**:
```typescript
override size(): EstimatedSize {
  const baseSize = this.baseArbitrary.size()
  const v = baseSize.value

  const baseLow = baseSize.type === 'estimated' ? baseSize.credibleInterval[0] : v
  const baseHigh = baseSize.type === 'estimated' ? baseSize.credibleInterval[1] : v

  const rateLow = this.sizeEstimation.inv(lowerCredibleInterval)
  const rateHigh = this.sizeEstimation.inv(upperCredibleInterval)

  return estimatedSize(
    Math.round(v * this.sizeEstimation.mode()),
    [
      Math.floor(baseLow * rateLow),
      Math.ceil(baseHigh * rateHigh)
    ]
  )
}
```

**MUST**:
1. Point estimate MUST use mode (or mean if prior is Beta(1,1))
2. Interval MUST use interval arithmetic (multiply bounds)
3. Rounding MUST be conservative (floor for lower, ceil for upper)

**Validation**:
- Study A validates convergence of point estimate
- Study D validates interval arithmetic conservatism
- Basic CI calibration study validates overall coverage (~92%)

**Known Limitation** (documented):
```typescript
// Interval arithmetic is CONSERVATIVE:
// - True coverage ~97% (observed) vs 90% target
// - Intervals wider than optimal Bayesian propagation
// - Tradeoff: Simpler computation vs precision loss
//
// Efficiency: ~1.5-2.0× wider than oracle (Study D.4)
// This is acceptable for most use cases.
//
// For tighter intervals, consider Study H (adaptive warmup) or
// true Bayesian propagation (Monte Carlo, computationally expensive)
```

### Shrinking Behavior

**Current Implementation**:
```typescript
override shrink(initialValue: FluentPick<A>) {
  if (!this.f(initialValue.value)) return NoArbitrary
  const shrunkBase = this.baseArbitrary.shrink(initialValue)

  // ... corner case check

  return shrunkBase.filter(v => this.f(v))
}
```

**MUST**:
1. Document that shrunk arbitrary has COLD START (fresh Beta posterior)
2. Validate coverage after shrinking (Study E)
3. Consider warm-start option if Study I shows benefit

**Required Documentation**:
```typescript
// Shrinking creates NEW FilteredArbitrary with:
// - Shrunk base space
// - Same predicate
// - COLD START posterior (fresh Beta(2,1), 10 warmup samples)
//
// Known limitation: Shrunk CI may be less accurate until warmup converges
// - Study E validates coverage ≥85% with constructor warmup (10 samples)
// - For critical applications, consider additional warmup before using shrunk size()
//
// Future work (Study I): Warm-start option to transfer parent posterior
```

**Optional Enhancement** (pending Study I results):
```typescript
override shrink(initialValue: FluentPick<A>, options?: { warmStart?: boolean }) {
  // ... existing logic

  const shrunk = shrunkBase.filter(v => this.f(v))

  if (options?.warmStart) {
    // Transfer parent posterior (scaled by shrink ratio)
    const shrinkRatio = shrunkBase.size().value / this.baseArbitrary.size().value
    shrunk.sizeEstimation.alpha = this.sizeEstimation.alpha * shrinkRatio
    shrunk.sizeEstimation.beta = this.sizeEstimation.beta * shrinkRatio
  }

  return shrunk
}
```

---

## Interval Arithmetic Requirements (combineArbitrarySizes)

**Current Implementation** (`util.ts:105-139`):
```typescript
export function combineArbitrarySizes(
  arbitraries: Iterable<{size(): ArbitrarySize}>,
  operation: 'product' | 'sum'
): ArbitrarySize
```

**MUST**:
1. Multiply/add bounds for interval arithmetic
2. Mark result as EstimatedSize if any input is estimated
3. Document conservatism

**Required Documentation**:
```typescript
/**
 * Combines size estimates using interval arithmetic.
 *
 * For products (tuples, records): sizes are multiplied, intervals are multiplied.
 * For sums (unions): sizes are added, intervals are added.
 *
 * IMPORTANT: Interval arithmetic is CONSERVATIVE:
 * - Assumes independence (arbitraries sample from different generators)
 * - Resulting intervals are wider than optimal Bayesian propagation
 * - Observed coverage ~97% vs 90% target (validated by ci-calibration study)
 * - Efficiency: ~1.5-2× wider than oracle Monte Carlo method
 *
 * Mathematical foundation:
 * - For independent X, Y with α-credible intervals [X_lo, X_hi], [Y_lo, Y_hi]:
 * - Product interval [X_lo × Y_lo, X_hi × Y_hi] has coverage ≥ α²
 * - For α=0.90, coverage ≥ 81% (theoretical lower bound)
 * - Observed coverage ~97% due to interval width exceeding minimum necessary
 *
 * Reference: ci-calibration.md, Moore et al. (2009) "Introduction to Interval Analysis"
 *
 * Known limitations:
 * - Assumes independence (correlation not handled, see Study K)
 * - Conservatism compounds with depth (Study D: width growth ~2× per level)
 * - For tighter intervals, use true Bayesian propagation (expensive)
 */
```

**Validation**:
- Basic CI calibration study: product coverage 98%, sum coverage 97.9%
- Study D: validates depth impact (coverage maintained, width grows)
- Study K: will test correlation effects (future work)

---

## Weighted Union Selection Requirements (ArbitraryComposite)

**Current Implementation** (`ArbitraryComposite.ts:32-56`):
```typescript
override pick(generator: () => number) {
  const weights = this.arbitraries.reduce(
    (acc, a) => { acc.push((acc.at(-1) ?? 0) + a.size().value); return acc },
    new Array<number>()
  )
  const lastWeight = weights.at(-1) ?? 0
  const picked = Math.floor(generator() * lastWeight)
  const index = weights.findIndex(s => s > picked)
  // ...
}
```

**MUST**:
1. Use size point estimates for weighting (`.value`)
2. Validate selection probability matches size ratio (Study G)
3. Handle edge case: size estimates with large uncertainty

**Validation**:
- Study G: chi-squared test validates proportional selection (p ≥ 0.05)
- Effect size (Cohen's h) < 0.2 (small, acceptable)

**Required Documentation**:
```typescript
/**
 * Selects one arbitrary from the union based on size-proportional weighting.
 *
 * Selection probability for arbitrary i:
 *   P(i) = size_i / sum(sizes)
 *
 * Uses point estimates (size.value) for weighting.
 * For EstimatedSize, uncertainty is not reflected in selection (limitation).
 *
 * Validation: Study G (Weighted Union Probability) shows:
 * - Selection frequencies match expected proportions (chi² test p ≥ 0.05)
 * - Effect size small (Cohen's h < 0.2)
 * - No systematic bias detected
 *
 * Known limitation: When sizes have large uncertainty (wide CIs),
 * selection may not optimally balance exploration vs exploitation.
 * Future work: Consider CI width in selection algorithm.
 */
```

---

## Statistical Utility Requirements

### Wilson Score Confidence Interval

**MUST add** to `analysis/util.py`:

```python
def wilson_score_interval(successes: int, n: int, alpha: float = 0.05) -> tuple:
    """
    Wilson score confidence interval for proportion.

    More accurate than normal approximation, especially for small n or extreme p.

    Args:
        successes: Number of successes (e.g., trials where true ∈ CI)
        n: Total number of trials
        alpha: Significance level (default 0.05 for 95% CI)

    Returns:
        (p_hat, (ci_lower, ci_upper))

    Reference: Wilson, E. B. (1927). "Probable Inference, the Law of Succession,
               and Statistical Inference". JASA.
    """
    from scipy import stats

    if n == 0:
        return (0.0, (0.0, 0.0))

    p_hat = successes / n
    z = stats.norm.ppf(1 - alpha/2)

    denominator = 1 + z**2 / n
    center = (p_hat + z**2 / (2*n)) / denominator
    margin = z * np.sqrt((p_hat * (1 - p_hat) / n + z**2 / (4*n**2))) / denominator

    ci_lower = max(0.0, center - margin)
    ci_upper = min(1.0, center + margin)

    return (p_hat, (ci_lower, ci_upper))
```

**Usage in all studies**:
```python
# Instead of: coverage = df['true_in_ci'].mean()
# Use:
successes = df['true_in_ci'].sum()
n = len(df)
coverage, (ci_lo, ci_hi) = wilson_score_interval(successes, n)
print(f"Coverage: {coverage:.1%} [{ci_lo:.1%}, {ci_hi:.1%}]")
```

### Chi-Squared Goodness-of-Fit Test

**MUST add** to `analysis/util.py`:

```python
def chi_squared_test(observed: np.ndarray, expected: np.ndarray) -> dict:
    """
    Chi-squared goodness-of-fit test.

    Tests null hypothesis: observed frequencies match expected proportions.

    Requirements:
    - All expected counts ≥ 5 (otherwise test is invalid)
    - Sample size n ≥ 5 × k, where k = number of categories

    Args:
        observed: Observed counts (array)
        expected: Expected counts (array, same length)

    Returns:
        {
            'chi2_stat': test statistic,
            'df': degrees of freedom,
            'p_value': p-value,
            'passes': bool (p ≥ 0.05),
            'min_expected': minimum expected count (should be ≥5)
        }
    """
    from scipy import stats

    assert len(observed) == len(expected)
    assert np.all(expected > 0), "Expected counts must be positive"

    chi2_stat = np.sum((observed - expected)**2 / expected)
    df = len(observed) - 1
    p_value = 1 - stats.chi2.cdf(chi2_stat, df)

    min_expected = np.min(expected)
    if min_expected < 5:
        warnings.warn(f"Minimum expected count {min_expected:.1f} < 5, test may be invalid")

    return {
        'chi2_stat': chi2_stat,
        'df': df,
        'p_value': p_value,
        'passes': p_value >= 0.05,
        'min_expected': min_expected
    }
```

**Usage in Study G**:
```python
# Weighted union selection test
result = chi_squared_test(observed_counts, expected_counts)
print(f"Chi² = {result['chi2_stat']:.2f}, df = {result['df']}, p = {result['p_value']:.3f}")
if result['passes']:
    print("✓ Null hypothesis not rejected (selection matches expected)")
else:
    print("✗ Null hypothesis rejected (systematic bias detected)")
```

### Cohen's h Effect Size

**MUST add** to `analysis/util.py`:

```python
def cohens_h(p1: float, p2: float) -> float:
    """
    Cohen's h effect size for difference between proportions.

    Interpretation:
    - h < 0.2: small effect (negligible difference)
    - 0.2 ≤ h < 0.5: medium effect
    - h ≥ 0.5: large effect

    Args:
        p1: First proportion
        p2: Second proportion

    Returns:
        Cohen's h

    Reference: Cohen, J. (1988). "Statistical Power Analysis for the
               Behavioral Sciences" (2nd ed.)
    """
    phi1 = 2 * np.arcsin(np.sqrt(p1))
    phi2 = 2 * np.arcsin(np.sqrt(p2))
    return np.abs(phi1 - phi2)
```

---

## Power Analysis Requirements

**MUST add** to `analysis/util.py`:

```python
def power_analysis_proportion(
    p0: float,
    p1: float,
    alpha: float = 0.05,
    power: float = 0.80
) -> dict:
    """
    Sample size calculation for proportion test.

    Args:
        p0: Null hypothesis proportion (e.g., 0.90)
        p1: Alternative hypothesis proportion (e.g., 0.85)
        alpha: Significance level (default 0.05)
        power: Desired power (default 0.80)

    Returns:
        {
            'n_required': required sample size,
            'cohens_h': effect size,
            'z_alpha': critical value for alpha,
            'z_beta': critical value for beta
        }
    """
    from scipy import stats

    # Effect size
    h = cohens_h(p0, p1)

    # Critical values
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = stats.norm.ppf(power)

    # Sample size
    n_required = np.ceil(
        (z_alpha + z_beta)**2 * (p0*(1-p0) + p1*(1-p1)) / (p0 - p1)**2
    )

    return {
        'n_required': int(n_required),
        'cohens_h': h,
        'z_alpha': z_alpha,
        'z_beta': z_beta
    }

# Usage:
result = power_analysis_proportion(p0=0.90, p1=0.85)
print(f"Required n: {result['n_required']} (Cohen's h = {result['cohens_h']:.3f})")
```

---

## Validation Requirements

All statistical implementations MUST be validated:

1. **Unit tests** for utility functions
   - Test Wilson score against known values
   - Test chi-squared against scipy reference
   - Test Cohen's h against manual calculation

2. **Integration tests** in studies
   - Verify power analysis matches manual calculation
   - Verify confidence intervals are conservative (not too narrow)

3. **Peer review** by statistician
   - External validation of methodology
   - Verification of mathematical correctness

---

## References

**MUST cite in code with DOIs/ISBNs**:

1. **Beta Distribution**:
   - Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). *[Bayesian Data Analysis](https://www.routledge.com/Bayesian-Data-Analysis/Gelman-Carlin-Stern-Dunson-Vehtari-Rubin/p/book/9781439840955)* (3rd ed.). Chapman and Hall/CRC. ISBN 978-1-439-84095-5. Chapter 2.

2. **Interval Arithmetic**:
   - Moore, R. E., Kearfott, R. B., & Cloud, M. J. (2009). *[Introduction to Interval Analysis](https://epubs.siam.org/doi/book/10.1137/1.9780898717716)*. SIAM. ISBN 978-0-898716-69-6. DOI: [10.1137/1.9780898717716](https://doi.org/10.1137/1.9780898717716)

3. **Wilson Score**:
   - Wilson, E. B. (1927). "[Probable Inference, the Law of Succession, and Statistical Inference](https://www.tandfonline.com/doi/abs/10.1080/01621459.1927.10502953)". *Journal of the American Statistical Association*, 22(158), 209-212. DOI: [10.1080/01621459.1927.10502953](https://doi.org/10.1080/01621459.1927.10502953)

4. **Power Analysis**:
   - Cohen, J. (1988). *[Statistical Power Analysis for the Behavioral Sciences](https://www.routledge.com/Statistical-Power-Analysis-for-the-Behavioral-Sciences/Cohen/p/book/9780805802832)* (2nd ed.). Lawrence Erlbaum Associates. ISBN 978-0-8058-0283-2.

5. **Chi-Squared Test**:
   - Pearson, K. (1900). "[On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling](https://www.tandfonline.com/doi/abs/10.1080/14786440009463897)". *Philosophical Magazine Series 5*, 50(302), 157-175. DOI: [10.1080/14786440009463897](https://doi.org/10.1080/14786440009463897)
