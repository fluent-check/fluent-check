# Spec: Evidence Documentation Standards (CI Calibration Studies)

## Overview

This spec defines the standards for credible interval calibration evidence documentation, ensuring all studies are methodologically sound, statistically rigorous, and reproducible.

## Requirements

### Study Design Requirements

**MUST**:
1. All studies MUST have deterministic test scenarios (no `Math.random()`)
2. All studies MUST have computable ground truth (analytical or exhaustive enumeration)
3. All studies MUST include power analysis justifying sample sizes
4. All studies MUST use proper statistical tests (chi-squared, not arbitrary thresholds)
5. All studies MUST report 95% confidence intervals on all coverage estimates
6. All hypotheses MUST have quantitative acceptance criteria

**MUST NOT**:
1. Studies MUST NOT use sequential testing on dependent checkpoints (use independent trials)
2. Studies MUST NOT use non-deterministic predicates (filters must be pure functions)
3. Studies MUST NOT use intractable ground truth (e.g., prime counting without cache)
4. Studies MUST NOT use arbitrary thresholds without statistical justification

### Statistical Rigor Requirements

**MUST**:
1. All coverage estimates MUST include Wilson score 95% confidence intervals
2. All studies MUST achieve ≥75% statistical power for detecting meaningful deviations (≥5%)
3. Chi-squared tests MUST have all expected counts ≥5 (sample size requirement)
4. Convergence analyses MUST report R² for fitted models
5. Effect sizes MUST be reported (Cohen's h for proportions)
6. Outliers MUST be detected and investigated (>2σ deviations)

**Sample Size Justification Template**:
```markdown
### Statistical Power Analysis

**Effect Size of Interest**: Detect if true coverage ≤ 85% (vs target 90%)

**Cohen's h**: 2 × |arcsin(√0.85) - arcsin(√0.90)| ≈ 0.155

**Power Calculation**:
- Desired power: 1 - β = 0.80
- Significance: α = 0.05
- Required n: 682

**Used**: n = 500 (achieves ~75% power, acceptable tradeoff)

**95% CI Width**: ±4.4% (allows distinguishing 90% from 85%)
```

### Terminology Requirements

**MUST use glossary terms consistently**:

- **Coverage**: Proportion of trials where true value ∈ credible interval (target: 90%)
- **Precision**: How narrow the credible interval is (measured as width or relative width)
- **Conservatism**: When coverage > target (e.g., 95% vs 90%), intervals wider than necessary
- **Efficiency**: Balance of coverage and precision = coverage / (1 + relative_width)
- **Calibration**: Synonym for coverage (whether CI contains true value at target rate)
- **Oracle**: Optimal method (true Bayesian propagation via Monte Carlo) for baseline comparison

**MUST NOT**:
- Mix "coverage" and "precision" (use separate metrics)
- Use "degradation" without specifying calibration vs precision
- Use "conservative" to mean both "high coverage" and "wide intervals" without clarification
- Mix frequentist and Bayesian language without clear definitions

### Ground Truth Computation Standards

**For Filters**:

1. **Preferred**: Analytical formula
   ```typescript
   // Example: Even numbers
   fc.integer(0, 999).filter(x => x % 2 === 0)
   // True size: 500 (analytical)
   ```

2. **Acceptable**: Exhaustive enumeration (for small spaces ≤10,000)
   ```typescript
   // Precompute once, cache result
   const trueSize = exhaustiveCount(0, 999, x => customPredicate(x))
   ```

3. **Acceptable**: Hash-based deterministic pseudo-random
   ```typescript
   // Deterministic but appears random
   fc.integer(0, 999).filter(x => ((x * 2654435761) >>> 0) % 100 < 30)
   // True size: exhaustive count (one-time cost)
   ```

**NOT ALLOWED**:
- Non-deterministic predicates: `x => Math.random() < 0.1`
- Intractable computations without caching: `x => isPrime(x)` for large ranges
- Approximations without error bounds: Prime Number Theorem ~5% error

### Study Structure Requirements

**Each study MUST have**:

1. **Question**: Clear research question
2. **Background**: Context and motivation
3. **Hypotheses**: Falsifiable, quantitative predictions with acceptance criteria
4. **Method**: Detailed procedure with scenarios, measurements, aggregation
5. **Ground Truth**: How true values are computed
6. **Statistical Power**: Sample size justification
7. **Acceptance Criteria**: Numerical thresholds for pass/fail
8. **Why This Matters**: Practical implications

**Example**:
```markdown
### Study B: Early Termination Correctness

**Question**: Does the early termination decision rule make correct decisions?

**Background**: [Explain mechanism]

**Hypotheses**:
- B1: False positive rate ≤ 5% (when triggered, true size < 1 in ≥95% of cases)
- B2: False negative rate ≤ 50% (when true size = 0, triggers in ≥50% of cases)

**Method**: [Detailed steps]

**Ground Truth**: [Exact computation]

**Statistical Power**: n=500 achieves 75% power for detecting ±5% deviation

**Acceptance Criteria**:
- B1 passes if: observed FPR ≤ 0.10 (5% target + 5% margin)
- B2 passes if: observed FNR ≤ 0.60 (50% target + 10% margin)

**Why This Matters**: [Practical impact]
```

### Baseline Comparison Requirements

**All studies MUST include baselines**:

1. **Naive**: Point estimate only (no interval)
   - Expected coverage: ~0%
   - Shows minimum viable approach

2. **Pessimistic**: Maximum uncertainty `[0, baseSize × 10]`
   - Expected coverage: 100%
   - Shows conservative extreme

3. **Current**: Interval arithmetic with Beta posteriors
   - Target coverage: 90%
   - Practical balance

4. **Oracle**: Monte Carlo from Beta posteriors
   - Optimal Bayesian method
   - Computational cost too high for production, but shows best achievable

**Efficiency Metric**:
```
efficiency = coverage / (1 + relative_width)
```
- Higher is better (high coverage with narrow intervals)
- Report ratio: current_efficiency / oracle_efficiency

### Outlier Detection Requirements

**All studies MUST detect outliers**:

```python
def detect_outliers(df):
    """
    Outliers are trials where:
    1. True value >2σ outside CI bounds
    2. CI width >5× median width
    3. Point estimate error >3× median error
    """
    # Implementation
```

**If outliers > 1% of trials**:
- MUST investigate root cause
- MUST document in study results
- MUST determine if systematic issue or random noise

### Convergence Analysis Requirements

**For studies testing convergence** (e.g., Study A):

1. **MUST define convergence metric**:
   - Mean Absolute Error: `MAE(n) = E[|estimate - true| / true]`
   - CI Width: `width(n) = E[CI_upper - CI_lower]`

2. **MUST specify convergence rate**:
   - Hypothesis: `MAE ~ a/√n + b`
   - Hypothesis: `width ~ c/√n + d`

3. **MUST report goodness-of-fit**:
   - R² ≥ 0.80 (acceptable fit to theoretical rate)
   - Residual plots to check assumptions

4. **MUST report asymptotic behavior**:
   - Asymptotic bias: `b` (should be < 0.05)
   - Asymptotic width: `d` (should be small relative to true size)

### Mathematical Proofs Requirements

**For claims about interval arithmetic**:

1. **MUST provide proof or citation**:
   ```markdown
   ### Theorem: Interval Arithmetic Preserves Coverage

   **Statement**: If X and Y are independent with α-credible intervals,
   product interval has coverage ≥ α².

   **Proof**: [Detailed derivation]

   **Citation**: Moore et al. (2009), Chapter 3
   ```

2. **MUST document assumptions**:
   - Independence required
   - Positive values assumed
   - Correlation effects unknown (Study K will test)

3. **MUST explain observed vs theoretical**:
   - Theory: coverage ≥ 81% (for α=0.90)
   - Observed: coverage ≈ 97%
   - Explanation: Intervals wider than minimum necessary

### Reproducibility Requirements

**All studies MUST be reproducible**:

1. **Deterministic seeds**: Use `getSeed(trialId)` for all RNG
2. **Version-controlled data**: CSV files in `docs/evidence/raw/`
3. **Documented dependencies**: Python packages, TypeScript versions
4. **Runnable scripts**: `npm run evidence:<study>` works without manual setup
5. **Verifiable results**: Running twice with same seed produces identical CSV

**Verification checklist**:
- [ ] Run study twice, diff CSVs (should be identical)
- [ ] Run on different machine, verify results match
- [ ] Run analysis script, verify figures generate without errors
- [ ] Check all figures have axis labels, legends, captions

---

## Study-Specific Requirements

### Study B (Early Termination)

**MUST**:
1. Correctly interpret `sizeEstimation.inv(upperCredibleInterval)` as **rate** not size
2. Distinguish one-sided (95th percentile) vs two-sided (90% CI)
3. Test edge case: early termination when base size is estimated
4. Include very rare filter scenario (0.1% pass rate)

**Ground truth scenarios**:
```typescript
// True size 0: impossible predicate
fc.integer(0, 99).filter(x => x > 200)

// True size 1: singleton
fc.integer(0, 99).filter(x => x === 0)

// True size 5: small set
fc.integer(0, 99).filter(x => x < 5)
```

### Study A (Convergence)

**MUST**:
1. Use independent trials per warmup count (not sequential checkpoints)
2. Test warmup counts: {10, 25, 50, 100, 200, 500}
3. Fit O(1/√n) convergence model with R² ≥ 0.80
4. Include warmup recommendation analysis

**Acceptance criteria**:
- Coverage ≥ 85% for warmup ≥ 50
- R² ≥ 0.90 for width fit
- R² ≥ 0.80 for MAE fit

### Study C (Adversarial Patterns)

**MUST**:
1. Use only deterministic, computable filters
2. Replace `isPrime` with modular/bit-pattern alternatives
3. Remove `Math.random()` entirely
4. Include baseline: uniform random filter with same pass rate

**Allowed patterns**:
- Modular: `x % 2 === 0`
- Bit-pattern: `popcount(x) % 2 === 0`
- Hash-based: `((x * 2654435761) >>> 0) % 100 < passRate`
- Clustered: `x < threshold`
- Magnitude-dependent: `x < 100 || (x >= 500 && x < 550)`

### Study D (Composition Depth)

**MUST**:
1. Separate calibration hypotheses (coverage) from precision hypotheses (width)
2. Define degradation quantitatively (width growth rate ≤ 2× per level)
3. Include oracle baseline (Monte Carlo) for depths 1-3
4. Report width ratio: actual / oracle

**Hypotheses**:
- D1: Coverage ≥ 90% (calibration)
- D2: Coverage ≤ 99% (not excessive)
- D3: Width growth ≤ 2× per level (precision)
- D4: Width ≤ 2× oracle (efficiency)

### Study E (Shrinking)

**MUST**:
1. Use only shrink scenarios with computable true sizes (exhaustive for ≤1,000)
2. Test warmup sensitivity: {0, 10, 50, 100} additional samples
3. Test pass rate change scenarios (shrunk space ≠ parent pass rate)
4. Document cold-start issue explicitly

**Scenarios**:
- Shrunk space ⊂ passing region (pass rate increases to 100%)
- Shrunk space same pattern (pass rate constant)

### Study F (flatMap)

**MUST**:
1. Verify implementation exists before proceeding
2. If missing: mark "FUTURE WORK" and create GitHub issue
3. If exists: document size propagation mechanism
4. Test dependency scenarios with known true sizes

**Implementation check**:
```bash
grep -r "flatMap" src/
grep -r "ChainedArbitrary" src/
```

### Study G (Weighted Union)

**MUST**:
1. Use chi-squared goodness-of-fit test (not arbitrary 10% threshold)
2. Ensure sample size gives all expected counts ≥5
3. Report Cohen's h effect size
4. Use n=10,000 (justified by smallest category requirement)

**Statistical test**:
```python
chi2_stat = np.sum((observed - expected)**2 / expected)
p_value = 1 - chi2.cdf(chi2_stat, df)
# Accept if p_value ≥ 0.05
```

---

## Validation Checklist

Before marking a study complete, verify:

- [ ] All hypotheses are falsifiable and quantitative
- [ ] All scenarios have computable ground truth
- [ ] All statistical tests are appropriate
- [ ] All sample sizes are justified by power analysis
- [ ] All results include 95% confidence intervals
- [ ] All figures have axis labels, legends, error bars
- [ ] All outliers (>1%) are investigated
- [ ] Baseline comparisons are included
- [ ] Study is reproducible (deterministic seeds)
- [ ] Glossary terms used consistently
- [ ] All claims have citations or proofs
- [ ] Documentation enables external audit

---

## References

**Statistical Methods**:
- Wilson, E. B. (1927). "[Probable Inference, the Law of Succession, and Statistical Inference](https://www.tandfonline.com/doi/abs/10.1080/01621459.1927.10502953)". *Journal of the American Statistical Association*, 22(158), 209-212. DOI: [10.1080/01621459.1927.10502953](https://doi.org/10.1080/01621459.1927.10502953)
- Cohen, J. (1988). *[Statistical Power Analysis for the Behavioral Sciences](https://www.routledge.com/Statistical-Power-Analysis-for-the-Behavioral-Sciences/Cohen/p/book/9780805802832)* (2nd ed.). Lawrence Erlbaum Associates. ISBN 978-0-8058-0283-2.

**Interval Arithmetic**:
- Moore, R. E., Kearfott, R. B., & Cloud, M. J. (2009). *[Introduction to Interval Analysis](https://epubs.siam.org/doi/book/10.1137/1.9780898717716)*. SIAM. ISBN 978-0-898716-69-6. DOI: [10.1137/1.9780898717716](https://doi.org/10.1137/1.9780898717716)

**Bayesian Statistics**:
- Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). *[Bayesian Data Analysis](https://www.routledge.com/Bayesian-Data-Analysis/Gelman-Carlin-Stern-Dunson-Vehtari-Rubin/p/book/9781439840955)* (3rd ed.). Chapman and Hall/CRC. ISBN 978-1-439-84095-5.

**Chi-Squared Test**:
- Pearson, K. (1900). "[On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling](https://www.tandfonline.com/doi/abs/10.1080/14786440009463897)". *Philosophical Magazine Series 5*, 50(302), 157-175. DOI: [10.1080/14786440009463897](https://doi.org/10.1080/14786440009463897)
