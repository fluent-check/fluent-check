# Advanced CI Calibration Studies

## Question

Does the credible interval (CI) system perform correctly under critical decision-making scenarios? Specifically, does it handle convergence, early termination, adversarial patterns, deep nesting, shrinking, and chaining robustly?

## Background

The basic CI calibration study validated that 90% credible intervals contain the true size ~92% of the time under standard conditions. However, the CI system is used for critical decisions in the codebase, such as early termination in `FilteredArbitrary`, weighted sampling in `ArbitraryComposite`, and search space calculation. This report covers seven advanced studies targeting these decision-critical paths.

## Glossary

**Coverage**: The proportion of trials where the true value falls within the credible interval.
- Example: "Coverage = 92%" means 92% of trials have true size ∈ [CI_lower, CI_upper]
- Target: 90% (from significance level)
- **Calibration** is a synonym (well-calibrated = coverage ≈ target)

**Precision**: How narrow the credible interval is.
- Measured as: CI width (upper - lower) or relative width (width / true size)
- Example: "Median width = 15%" means median(CI_upper - CI_lower) / true_size = 0.15
- Narrower is better (more precise information)

**Conservatism**: When coverage > target (e.g., 95% vs 90%).
- Conservative intervals are wider than necessary
- Pro: safer (less risk of underestimation)
- Con: less precise (wastes information)

**Efficiency**: The balance of coverage and precision.
- Formula: coverage / (1 + relative_width)
- Higher is better (high coverage, narrow width)

**Interval Arithmetic**: Propagating intervals by operating on bounds.
- Product: [a,b] × [c,d] = [ac, bd]
- Sum: [a,b] + [c,d] = [a+c, b+d]
- Typically conservative (wider than true Bayesian propagation)

**Oracle**: The optimal method (true Bayesian propagation via Monte Carlo).
- Used as baseline for comparison
- Computationally expensive (not practical for production)

**Warmup**: Initial sampling to prime the Beta posterior before using size estimates.
- Current: 10 samples (constructor default)
- Studies use: 200 samples (for validation)

## Studies Overview

| ID | Study | Question | Method | Priority |
|----|-------|----------|--------|----------|
| A | Convergence Dynamics | How quickly does CI converge to target coverage? | Independent trials at warmup counts {10, 25, 50, 100, 200, 500}. | P1 |
| B | Early Termination | Does the decision rule make correct decisions? | Test filters with known true sizes: 0, 1, 5, 10, 50, 100. | P0 |
| C | Adversarial Patterns | Does calibration hold for non-uniform patterns? | Test deterministic structured predicates (modulo, clusters, hash-based). | P0 |
| D | Composition Depth | Does coverage degrade with nesting? | Measure coverage and width growth for depths 1-5. | P1 |
| E | Shrinking | Does calibration hold for shrunk arbitraries? | Test cold-start shrinking with known pass rate changes. | P1 |
| F | Chaining (flatMap) | Does size propagate correctly through chaining? | Test ChainedArbitrary with known size relationships. | P2 |
| G | Weighted Union | Is sampling proportional to size? | Chi-squared test of empirical selection frequencies. | P1 |

## Results

### Study A: Convergence Dynamics

**Question**: How quickly does the CI converge to its target coverage as samples accumulate?

**Hypotheses:**
- **A1**: Coverage ≥90% for all warmup counts ≥50
  - Rationale: Beta posterior converges quickly for moderate sample sizes
- **A2**: CI width decreases as O(1/√n) (theoretical convergence rate)
  - Rationale: Standard error of proportion estimate
- **A3**: Point estimate mean absolute error decreases as O(1/√n)
  - Rationale: Consistent estimator with standard convergence

**Method:**
1. **Independent Trials Design** (avoids sequential testing bias):
   - For each warmup count w ∈ {10, 25, 50, 100, 200, 500}:
     - Run 500 independent trials
     - Each trial: create fresh FilteredArbitrary, sample exactly w times, measure CI
   - Total: 6 × 500 = 3000 independent trials

2. **Scenarios:**
   - Pass rate ∈ {10%, 30%, 50%, 70%, 90%}
   - Base size = 1000 (large enough to ignore finite-population effects)

3. **Measurements per trial:**
   - True size (known)
   - Estimated size (posterior mode)
   - CI bounds (5th and 95th percentiles)
   - CI width (upper - lower)
   - True in CI (boolean)
   - Warmup count (w)

4. **Aggregation** (per warmup count):
   - Coverage = proportion of trials with true ∈ CI
   - Coverage 95% CI = Wilson score interval
   - Mean/median/95th percentile CI width
   - Mean absolute error = mean(|estimated - true| / true)

5. **Convergence Analysis:**
   - Plot coverage vs warmup count (with 95% CI error bars)
   - Fit CI width ~ a/√w + b (test A2)
   - Fit MAE ~ c/√w + d (test A3)
   - Report R² for fits

**Statistical Power:**
- Per warmup count: n=500 trials
- 95% CI width ≈ ±4.4%
- Can detect if coverage < 85% or > 95% with power >80%

**Acceptance Criteria:**
- A1 passes if: coverage ≥ 85% for w ≥ 50
- A2 passes if: R² ≥ 0.90 for width ~ a/√w fit
- A3 passes if: R² ≥ 0.80 for MAE ~ c/√w fit

**Status**: 🔴 NOT YET IMPLEMENTED - Requires independent trial redesign

**Why This Matters:**
- FilteredArbitrary constructor uses 10 warmup samples
- If coverage is poor at w=10, we need to increase warmup
- If coverage good at w=50, we might reduce warmup for efficiency
- Convergence rate informs adaptive stopping criteria (future Study H)

### Study B: Early Termination Correctness

**Question**: Does the early termination decision rule make correct decisions?

**Background:**
FilteredArbitrary stops trying to find values when:
```typescript
baseSize * sizeEstimation.inv(0.95) < 1
```

This uses the **95th percentile** of the posterior distribution over pass rates.
This means: "If even the optimistic estimate (95th percentile) suggests size < 1, stop trying."

This is a **one-sided decision rule** (conservative: biased toward trying longer rather than stopping early).

**Hypotheses:**
- **B1**: When the decision rule triggers (95th percentile estimate < 1), the true size is < 1 in ≥95% of cases
  - Rationale: The 95th percentile should have 5% false positive rate by definition
- **B2**: False negative rate (continue trying when true size = 0) ≤ 50%
  - Rationale: Acceptable to waste effort on edge cases, but should terminate eventually
- **B3**: For filters with true size ≥ 10, early termination never triggers
  - Rationale: Decision rule should only stop for genuinely empty/tiny spaces
- **B4**: Early termination on estimated base sizes is conservative (when base size itself is uncertain)
  - Rationale: Should use upper bound of base size CI for conservatism

**Method:**
1. Create filtered arbitraries with known true sizes: 0, 1, 5, 10, 50, 100
2. For each true size:
   a. Sample until either: (1) early termination triggers, (2) 1000 samples collected, or (3) 100 values found
   b. Record: did early termination trigger? after how many samples?
   c. Record: true size, estimated size, 95th percentile estimate at termination
3. Aggregate across 500 trials per true size
4. Compute:
   - P(true size < 1 | early termination triggered) [should be ≥0.95 for B1]
   - P(early termination triggered | true size = 0) [should be ≥0.50 for B2]
   - P(early termination triggered | true size ≥ 10) [should be ≈0.00 for B3]

**Ground Truth Computation:**
- True size 0: `fc.integer(0, 99).filter(x => x > 200)` [impossible]
- True size 1: `fc.integer(0, 99).filter(x => x === 0)` [exactly one value]
- True size 5: `fc.integer(0, 99).filter(x => x < 5)` [exactly 5 values]
- True size 10: `fc.integer(0, 99).filter(x => x < 10)` [exactly 10 values]
- True size 50: `fc.integer(0, 99).filter(x => x < 50)` [exactly 50 values]
- True size 100: `fc.integer(0, 99).filter(x => true)` [all values pass]

**Edge Cases to Test:**
1. **Composed base size**: What if `baseSize` itself is estimated (tuple of filters)?
   - Current code uses `baseSize.value`, ignoring uncertainty
   - Should use `baseSize.credibleInterval[1]` (upper bound) for conservatism
2. **Very rare filters** (0.1% pass rate): Does posterior converge before termination?
   - Add scenario with pass rate = 0.001 (1 in 1000)

**Statistical Power:**
- Effect size: Detect deviation of ±5% from target (e.g., 90% vs 95%)
- With n=500, 95% CI width ≈ ±4.4%, sufficient to detect ±5% deviation
- Power ≥80% for detecting meaningful miscalibration

**Acceptance Criteria:**
- B1 passes if: P(true size < 1 | early termination) ≥ 90% (allowing 5% tolerance from theoretical 95%)
- B2 passes if: P(early termination | true size = 0) ≥ 50%
- B3 passes if: P(early termination | true size ≥ 10) ≤ 5%

**Status**: 🔴 NOT YET IMPLEMENTED - Requires methodology redesign

**Why This Matters:**
- Incorrect early termination wastes computation (false negatives)
- Premature termination causes test failures (false positives)
- Understanding calibration informs threshold tuning

### Study C: Adversarial Filter Patterns

**Question**: Does CI calibration hold for non-uniform, structured filter patterns?

**Background:**
Real-world predicates often have structure:
- **Clustered acceptance**: Values passing filter are grouped together
- **Modular patterns**: Acceptance depends on value mod k
- **Magnitude-dependent**: Different pass rates for different value ranges
- **Bit-pattern dependent**: Acceptance depends on binary representation

These differ from uniform random filters (x => random() < p) used in basic studies.

**Hypotheses:**
- **C1**: Clustered acceptance maintains coverage ≥90%
- **C2**: Modular patterns maintain coverage ≥90%
- **C3**: Magnitude-dependent patterns maintain coverage ≥90%
- **C4**: Bit-pattern patterns maintain coverage ≥90%
- **C5**: Hash-based deterministic patterns maintain coverage ≥90%

**Scenarios** (all with computable ground truth):

1. **Clustered Acceptance** (10% overall pass rate):
   ```typescript
   fc.integer(0, 999).filter(x => x < 100)
   // True size: 100
   // All passing values in first 10% of range
   ```

2. **Modular Pattern** (~50% pass rate):
   ```typescript
   fc.integer(0, 999).filter(x => x % 2 === 0)
   // True size: 500
   // Even numbers only
   ```

3. **Magnitude-Dependent** (biased pass rate):
   ```typescript
   fc.integer(0, 999).filter(x => x < 100 || (x >= 500 && x < 550))
   // True size: 100 + 50 = 150
   // High pass rate for small values, low for large
   ```

4. **Bit-Pattern Dependent** (~50% pass rate):
   ```typescript
   fc.integer(0, 1023).filter(x => popcount(x) % 2 === 0)
   // True size: 512
   // Even number of 1-bits in binary representation
   ```

5. **Hash-Based Pseudo-Random** (30% pass rate, deterministic):
   ```typescript
   fc.integer(0, 999).filter(x => ((x * 2654435761) >>> 0) % 100 < 30)
   // True size: ~300 (exact count via exhaustive enumeration)
   // Deterministic but appears random
   ```

**Ground Truth Computation:**
- For modular/clustered: analytical formula
- For bit-pattern: known mathematical result (balanced binary function)
- For hash-based: one-time exhaustive enumeration, cache result
- All filters are **deterministic** and **reproducible**

**Method:**
1. For each scenario:
   - Run 500 trials
   - Each trial: fresh FilteredArbitrary, warmup 200 samples
   - Measure: true size (known), estimated size, CI, coverage
2. Aggregate coverage per scenario
3. Compare to baseline (uniform random filter with same pass rate)

**Statistical Power:**
- n=500 per scenario
- Can detect coverage < 85% with power >80%
- Wilson score 95% CI width ≈ ±4.4%

**Acceptance Criteria:**
- Each hypothesis (C1-C5) passes if: coverage ≥ 85%
- Overall study passes if: all 5 scenarios achieve coverage ≥ 85%

**Status**: 🔴 NOT YET IMPLEMENTED - Requires deterministic filter redesign

**Why This Matters:**
- Real predicates have structure (e.g., `x > threshold`, `x.length < N`)
- Beta distribution assumes uniform random sampling
- Structured patterns may violate independence assumptions
- Need evidence that calibration holds for realistic use cases

### Study D: Composition Depth Impact

**Question**: Does coverage degrade with nesting depth, and how does precision change?

**Background:**
When composing filtered arbitraries (e.g., tuples, arrays, records with filtered fields), the CI system uses **interval arithmetic** to propagate uncertainty. This is conservative but may compound errors with depth.

**Mathematical Foundation:**
For independent intervals with α-credible coverage:
- Product: P(X∈CI_X AND Y∈CI_Y) ≥ α² (conservative lower bound)
- For α=0.90, theoretical minimum coverage = 0.90² = 81%
- Observed coverage >81% indicates conservatism (intervals wider than necessary)

**Hypotheses (Separated by Concern):**

**Calibration:**
- **D1**: Coverage ≥90% for depth ≤ 3
- **D2**: Coverage ≥85% for depth ≤ 5
- **D3**: Coverage ≤99% for all depths (not excessively conservative)

**Precision:**
- **D4**: Width growth ≤ 2× per composition level
- **D5**: Median relative width ≤ 2× oracle width

**Method:**
1. Create nested filtered arbitraries:
   - Depth 1: `fc.integer(0, 999).filter(passRate=50%)`
   - Depth 2: `fc.tuple(filtered, filtered)` (product of two filtered)
   - Depth 3: `fc.tuple(depth2, filtered)` (product of three filtered)
   - ...
   - Depth 5: Product of five filtered arbitraries

2. For each depth:
   - Run 500 trials
   - Measure: true size, estimated size, CI, coverage, width
   - Compare to oracle (Monte Carlo from Beta posteriors)

3. Measure:
   - Coverage = proportion with true ∈ CI
   - Median relative width = median((CI_upper - CI_lower) / true_size)
   - Width growth rate = fit exp(k * depth) or linear(a * depth)

**Ground Truth Computation:**
- Depth 1: Analytical (base_size × pass_rate)
- Depth d: Product of d independent filters
  - True size = base_size^d × ∏(pass_rate_i)
  - Each filter has known pass rate (e.g., 50% = even numbers)

**Oracle Baseline:**
- Sample from each Beta posterior independently
- Multiply sampled pass rates
- Repeat 10,000 times to get distribution
- Compute 5th and 95th percentiles (true Bayesian propagation)

**Statistical Power:**
- n=500 per depth
- Can detect coverage < 85% with power >80%

**Acceptance Criteria:**
- D1-D2 pass if: coverage in target range
- D3 passes if: coverage ≤ 99% (not wastefully conservative)
- D4 passes if: width_ratio(d+1)/width_ratio(d) ≤ 2
- D5 passes if: median(width / oracle_width) ≤ 2

**Why This Matters:**
- Deeply nested structures (e.g., arrays of records with filtered fields) are common
- If coverage degrades, we risk under-estimation
- If width grows exponentially, size estimates become useless
- Understanding tradeoff informs when to use exact computation vs approximation

**Status**: 🟡 PARTIALLY IMPLEMENTED - Has results but needs separation of calibration/precision and oracle comparison

### Study E: Shrinking

**Question**: Does calibration hold for shrunk filtered arbitraries?

**Background:**
When a test fails, FluentCheck shrinks the counterexample by calling `arbitrary.shrink(failingValue)`. For FilteredArbitrary, this creates a new FilteredArbitrary with a reduced search space. The size estimation starts **cold** (no prior information transferred from parent).

**Cold-Start Problem:**
- Parent FilteredArbitrary may have sampled 1000s of values (well-calibrated posterior)
- Shrunk child starts with Beta(2,1) prior (no warmup)
- If shrunk space is small, warmup may be insufficient for calibration

**Hypotheses:**
- **E1**: Coverage ≥90% when shrunk space has same pass rate as parent
- **E2**: Coverage ≥85% when shrunk space has higher pass rate (subset of passing values)
- **E3**: Warmup sensitivity: Coverage improves with additional warmup samples

**Method:**
1. **Scenario 1: Same Pass Rate**
   ```typescript
   // Parent: fc.integer(0, 999).filter(x => x % 2 === 0)  [pass rate 50%]
   // Shrunk: fc.integer(0, 499).filter(x => x % 2 === 0)  [pass rate 50%]
   // True size: 250
   ```

2. **Scenario 2: Higher Pass Rate (Subset)**
   ```typescript
   // Parent: fc.integer(0, 999).filter(x => x < 500)  [pass rate 50%]
   // Shrunk: fc.integer(0, 199).filter(x => x < 500)  [pass rate 100%]
   // True size: 200
   ```

3. **Warmup Sensitivity:**
   - Test with additional warmup: {0, 10, 50, 100} samples
   - Measure coverage improvement

**Ground Truth Computation:**
- All scenarios use analytically computable true sizes
- Small spaces (≤1000 values) allow exhaustive verification

**Statistical Power:**
- n=500 per scenario × warmup count
- Can detect coverage < 85% with power >80%

**Acceptance Criteria:**
- E1 passes if: coverage ≥ 90%
- E2 passes if: coverage ≥ 85%
- E3 passes if: coverage(warmup=100) > coverage(warmup=0) by ≥5%

**Future Work:**
- Study I: Warm-start shrinking (transfer parent posterior)
  - Hypothesis: Can maintain coverage with 50% fewer samples

**Status**: 🔴 NOT YET IMPLEMENTED

**Why This Matters:**
- Shrinking is critical for debugging (produces minimal counterexamples)
- If size estimation fails during shrinking, tests may become flaky
- Understanding cold-start degradation informs warmup tuning

### Study F: Chaining (flatMap)

**Question**: Does size estimation propagate correctly through ChainedArbitrary (flatMap)?

**Background:**
`ChainedArbitrary` implements dependent composition: pick a value from base arbitrary, then use it to select a second arbitrary. Example:
```typescript
fc.integer(1, 10).flatMap(n => fc.array(fc.integer(), {minLength: n, maxLength: n}))
// Pick a number n, then create array of length n
```

**Current Implementation (src/arbitraries/ChainedArbitrary.ts:9):**
```typescript
override size() { return this.baseArbitrary.size() }
```
This returns only the base size, **ignoring the chained arbitrary's size**. This may cause:
- Weighted union selection bias
- Search space under-estimation
- Incorrect early termination

**Hypotheses:**
- **F1**: Current implementation maintains coverage ≥90% (may be conservative)
- **F2**: Width is not excessively large (≤3× optimal)
- **F3**: True Bayesian propagation improves precision by ≥30%

**Method:**
1. **Test Scenarios:**
   ```typescript
   // Scenario 1: Independent chain (size = base_size × chain_size)
   fc.integer(0, 9).flatMap(n => fc.integer(0, 99))
   // True size: 10 × 100 = 1000

   // Scenario 2: Dependent chain (size = Σ chain_size(i))
   fc.integer(1, 10).flatMap(n => fc.array(fc.integer(0, 9), {length: n}))
   // True size: Σ(n=1 to 10) 10^n

   // Scenario 3: Filtered chain
   fc.integer(0, 9).flatMap(n => fc.integer(0, 99).filter(x => x < n * 10))
   // True size: Σ(n=0 to 9) min(n × 10, 100)
   ```

2. For each scenario:
   - Run 500 trials
   - Measure: true size (analytical), current estimate, oracle estimate
   - Compare coverage and width

**Ground Truth Computation:**
- Scenario 1: Analytical (product)
- Scenario 2: Analytical (sum of geometric series)
- Scenario 3: Analytical (piecewise sum)

**Oracle Baseline:**
- For each base value, sample from chained arbitrary's posterior
- Aggregate across base distribution
- Monte Carlo estimate of size distribution

**Statistical Power:**
- n=500 per scenario
- Can detect coverage < 85% with power >80%

**Acceptance Criteria:**
- F1 passes if: coverage ≥ 85%
- F2 passes if: median(width / oracle_width) ≤ 3
- F3 passes if: oracle precision improves width by ≥30%

**Status**: 🔴 NOT YET IMPLEMENTED

**Why This Matters:**
- flatMap is essential for dependent generation (e.g., array length depends on first value)
- Incorrect size estimation affects weighted unions and early termination
- Understanding propagation informs potential improvements

**Implementation Note:**
ChainedArbitrary exists in codebase (src/arbitraries/ChainedArbitrary.ts:4), so study is feasible.

### Study G: Weighted Union Selection

**Question**: Is union branch selection proportional to estimated sizes?

**Background:**
`ArbitraryComposite` (union/oneOf) selects branches with probability proportional to their estimated sizes:
```typescript
frequencies[i] = alternatives[i].size().value
```

If size estimates are biased or uncertain, selection frequencies may deviate from the ideal (true size-proportional).

**Hypotheses:**
- **G1**: Observed selection frequencies match expected frequencies (chi-squared goodness-of-fit, α=0.05)
- **G2**: Effect size (Cohen's h) is small (h < 0.2) for any deviation
- **G3**: Absolute error in selection probability is ≤ 2% for all branches

**Method:**
1. Create unions with known true sizes:
   ```typescript
   fc.oneOf(
     fc.integer(0, 99),                    // size: 100
     fc.integer(0, 99).filter(x => x % 2 === 0),  // size: 50
     fc.integer(0, 9)                      // size: 10
   )
   // Expected selection probabilities: 100/160 = 62.5%, 50/160 = 31.25%, 10/160 = 6.25%
   ```

2. Sample 10,000 times, count selections per branch

3. Statistical tests:
   - **Chi-squared test**: H0: observed = expected
   - **Cohen's h**: Effect size for each branch
   - **Absolute error**: |observed - expected| per branch

**Ground Truth:**
- All branches have analytically computable sizes
- Expected frequencies = true_size_i / Σ(true_sizes)

**Statistical Power:**
- n=10,000 selections
- Can detect ≥2% deviation with power >80%
- Chi-squared requires all expected counts ≥5 (met)

**Acceptance Criteria:**
- G1 passes if: chi-squared test p-value ≥ 0.05 (no significant deviation)
- G2 passes if: max Cohen's h < 0.2 (small effect size)
- G3 passes if: all |observed - expected| ≤ 2%

**Why This Matters:**
- Biased selection wastes effort on large branches
- Under-selection of rare branches reduces diversity
- Adaptive sampling (FilteredArbitrary size changes) may cause drift

**Status**: 🟡 PARTIALLY IMPLEMENTED - Has results but needs chi-squared test instead of arbitrary threshold

## Summary of Implementation Status

| Study | Status | Action Required |
|-------|--------|-----------------|
| A - Convergence Dynamics | 🔴 Needs Redesign | Implement independent trial design, add convergence rate analysis |
| B - Early Termination | 🔴 Needs Redesign | Rewrite with correct decision rule interpretation, add edge cases |
| C - Adversarial Patterns | 🔴 Needs Redesign | Replace non-deterministic filters with deterministic patterns |
| D - Composition Depth | 🟡 Partial | Add oracle comparison, separate calibration/precision metrics |
| E - Shrinking | 🔴 Not Implemented | Create study with known shrunk scenarios |
| F - Chaining (flatMap) | 🔴 Not Implemented | Validate size propagation through ChainedArbitrary |
| G - Weighted Union | 🟡 Partial | Replace arbitrary threshold with chi-squared test |

## Key Findings (Preliminary)

Based on partial implementations and the basic CI calibration study:

1. **Bayesian Estimation Works**: The Beta posterior provides well-calibrated credible intervals (~92% coverage for 90% target)
2. **Interval Arithmetic is Conservative**: Composition leads to wider intervals (coverage ~97-100%), preserving safety at cost of precision
3. **Early Termination Needs Validation**: Current implementation needs proper statistical validation of decision rule
4. **Structured Filters Need Testing**: Real-world predicates have patterns (modular, clustered) not yet validated

## Critical Issues Requiring Resolution

### 1. Mathematical Correctness (Priority: P0)
- **Study B**: Decision rule uses 95th percentile, but study mixes one-sided/two-sided concepts
- **Study A**: Sequential testing bias invalidates current checkpoint approach
- **Study C**: Non-deterministic filters (`Math.random()`) make results irreproducible

### 2. Statistical Rigor (Priority: P0)
- **All studies**: Missing power analysis (cannot determine if sample sizes are adequate)
- **Study G**: Arbitrary 10% threshold should be replaced with chi-squared test
- **All studies**: No confidence intervals on coverage estimates

### 3. Unexplained Design Choices (Priority: P1)
- **Beta(2,1) prior**: Why optimistic bias? Should compare to Beta(1,1) or Beta(0.5,0.5)
- **Warmup count**: Why 10 in code but 200 in studies? Needs sensitivity analysis
- **Interval arithmetic**: Conservatism empirically observed but not mathematically proven

### 4. Coverage Gaps (Priority: P1)
- **Shrinking**: Cold-start problem not studied (Study E not implemented)
- **ChainedArbitrary**: Size propagation not validated (Study F not implemented)
- **Correlation**: Assumes independent filters, but real predicates may be correlated

## Recommendations

### Immediate Actions (Block Implementation)

1. **Fix Study Methodologies**:
   - Study A: Replace checkpoints with independent trials per warmup count
   - Study B: Rewrite hypotheses to correctly interpret 95th percentile decision rule
   - Study C: Replace `isPrime` and `Math.random()` with deterministic, computable filters

2. **Add Statistical Rigor**:
   - Compute power analysis for all studies (justify n=500 with 80% power requirement)
   - Add Wilson score confidence intervals to all coverage estimates
   - Replace arbitrary thresholds with proper statistical tests

3. **Verify Code References**:
   - Confirm `ChainedArbitrary.ts:9` implements size propagation as assumed (✓ Verified: exists but only returns base size)
   - Document Beta(2,1) prior choice in `FilteredArbitrary.ts:11` with reference to validation study

### High Priority (Required for Validity)

4. **Implement Missing Studies**:
   - Study E (Shrinking): Test calibration under cold-start conditions
   - Study F (Chaining): Validate size propagation, compare to oracle
   - Enhanced Study G: Add chi-squared test and Cohen's h effect size

5. **Investigate Anomalies**:
   - Filter chain depth-2 vs depth-3 coverage discrepancy (86.6% vs 95.6%)
   - Re-run with n=10,000 trials, add 95% confidence intervals
   - Check for code bugs in depth-2 scenario

6. **Add Baselines**:
   - Oracle: True Bayesian propagation via Monte Carlo
   - Naive: Point estimate only (no intervals)
   - Pessimistic: Always [0, baseSize]
   - Quantify gap to optimal

### Medium Priority (Improve Quality)

7. **Document Assumptions**:
   - Add mathematical proof that interval arithmetic preserves conservatism
   - Or cite theorem + add Study K to test under correlation
   - Document when interval arithmetic assumptions break down

8. **Enhance Reporting**:
   - All coverage estimates: include 95% CI (not just point estimate)
   - All width metrics: report min/max/median/95th percentile
   - Add outlier detection: flag trials with true >2σ outside CI
   - Add efficiency metric: coverage / (1 + relative_width)

9. **Warmup Sensitivity**:
   - Make Study A focus on warmup count {10, 25, 50, 100, 200}
   - Recommend optimal warmup based on coverage + efficiency tradeoff
   - Update FilteredArbitrary constructor if evidence supports change

### Future Work (Explore Ideas)

10. **Adaptive Warmup** (Study H):
    - Stop warmup when CI width stabilizes or reaches target precision
    - Hypothesis: Reduces samples by 30% while maintaining 90% coverage

11. **Warm-Start Shrinking** (Study I):
    - Transfer parent posterior to shrunk arbitrary (scaled by shrink ratio)
    - Hypothesis: Maintains coverage with 50% fewer warmup samples

12. **Non-Uniform Bases** (Study J):
    - Test calibration on exponential, geometric, frequency-weighted distributions
    - Hypothesis: Coverage ≥90% regardless of base distribution shape

13. **Correlation Effects** (Study K):
    - Test interval arithmetic under positive/negative filter correlation
    - Hypothesis: Conservatism preserved (coverage ≥95%) under correlation

## Reproduction

**Note**: Most studies require methodology redesign before re-running. Current implementations have critical issues identified in this document.

### Current Studies (Require Fixes Before Re-running)
```bash
# WARNING: These studies have methodology issues - results may be invalid
npx tsx scripts/evidence/execute.ts ci-convergence         # Study A - needs independent trial design
npx tsx scripts/evidence/execute.ts early-termination      # Study B - needs correct hypothesis rewrite
npx tsx scripts/evidence/execute.ts adversarial-patterns   # Study C - needs deterministic filters
npx tsx scripts/evidence/execute.ts composition-depth      # Study D - partial, needs oracle comparison
npx tsx scripts/evidence/execute.ts weighted-union         # Study G - needs chi-squared test
```

### Studies to Implement
```bash
# Study E: Shrinking - NOT YET IMPLEMENTED
# Study F: Chaining (flatMap) - NOT YET IMPLEMENTED
# Study H: Adaptive Warmup - FUTURE WORK
# Study I: Warm-Start Shrinking - FUTURE WORK
# Study J: Non-Uniform Bases - FUTURE WORK
# Study K: Correlation Effects - FUTURE WORK
```

### Analysis Pipeline
```bash
# After studies are fixed and re-run, regenerate analysis:
python analysis/ci_calibration.py         # Basic study analysis
python analysis/ci_convergence.py         # Study A (after fix)
python analysis/ci_early_termination.py   # Study B (after fix)
python analysis/adversarial_patterns.py   # Study C (after fix)
python analysis/composition_depth.py      # Study D (enhanced)
python analysis/weighted_union.py         # Study G (enhanced)
```

## Next Steps

1. **Review and approve this specification** with stakeholders
2. **Implement Phase 1 fixes** (critical methodology corrections)
3. **Re-run studies** with corrected designs
4. **Validate results** against acceptance criteria
5. **Update recommendations** based on empirical findings
6. **Decide on code changes** (Beta prior, warmup count, warm-start option)

## Open Questions for Stakeholders

1. **Beta prior**: Keep Beta(2,1) or switch to Beta(1,1) [uniform] or Beta(0.5,0.5) [Jeffreys]?
   - Current: Optimistic bias (mode at 1.0)
   - Requires: Comparative study or theoretical justification

2. **Warmup count**: Accept study recommendation or keep current value (10)?
   - Constructor uses: 10 samples
   - Studies use: 200 samples
   - Requires: Study A results to inform decision

3. **Target precision**: What is acceptable width ratio vs oracle?
   - Current: Not specified
   - Options: 1.5×, 2.0×, 3.0× oracle width
   - Tradeoff: Computation cost vs precision

4. **Warm-start shrinking**: If Study I shows benefit, make it default?
   - Requires: Study I implementation and results
   - Consideration: Breaking change if default behavior changes

## References

- Basic CI Calibration Study: `docs/evidence/ci-calibration.md`
- Implementation: `src/arbitraries/FilteredArbitrary.ts`
- Studies: `scripts/evidence/ci-*.study.ts`
- Analysis: `analysis/ci_*.py`
- Openspec Proposal: `openspec/changes/fix-ci-calibration-advanced-studies/`