# Design: Fix CI Calibration Advanced Studies

## Context

The basic CI calibration study (`docs/evidence/ci-calibration.md`) successfully validates that 90% credible intervals contain the true size ~92% of the time. The advanced studies document (`docs/evidence/ci-calibration-advanced.md`) proposes 7 additional studies for realistic PBT scenarios. However, detailed review identified 22 critical issues that must be resolved before implementation.

This design specifies the complete remediation plan with detailed technical specifications for all fixes.

## Goals

- Eliminate all mathematical errors and methodology gaps
- Ensure all studies are deterministic, reproducible, and statistically valid
- Add missing statistical rigor (power analysis, proper tests, confidence intervals)
- Clarify all ambiguous terminology and undefined concepts
- Explore unexplored ideas that could improve the system
- Enable external audit and replication

## Non-Goals

- Modifying core statistical algorithms (separate proposals after evidence gathered)
- Comparing to other PBT frameworks (out of scope)
- Real-world benchmarks (too variable, not controlled)

---

## Issue Catalog and Detailed Fixes

### CRITICAL METHODOLOGY GAPS

#### Issue #1: Study B - Mathematical Logic Error

**Location**: `ci-calibration-advanced.md` lines 44-59, `FilteredArbitrary.ts` line 61

**Problem Description**:
The early termination condition is:
```typescript
while (baseSize * sizeEstimation.inv(upperCredibleInterval) >= 1)
```

Where `upperCredibleInterval = 0.95` (probability) and `sizeEstimation.inv(0.95)` returns the 95th percentile of the **pass rate** (Beta distribution quantile, value ∈ [0,1]).

The code multiplies `baseSize` (absolute count) by a **rate** to get expected size, which is correct. However, Study B's hypothesis B1 states:

> "When terminating early, the true size is actually < 1 (empty filter) with ≥90% confidence"

This conflates:
1. The **decision rule** (stop when 95th percentile of size estimate < 1)
2. The **calibration question** (in what fraction of cases where we stop is true size actually < 1?)

These are different! The decision rule uses the 95th percentile (one-sided), but the calibration uses 90% credible intervals (two-sided: 5th to 95th percentile).

**Detailed Fix**:

```markdown
### Study B: Early Termination Correctness

**Question**: Does the early termination decision rule make correct decisions?

**Background**:
FilteredArbitrary stops trying to find values when:
```typescript
baseSize * sizeEstimation.inv(0.95) < 1
```

This uses the **95th percentile** of the posterior distribution over pass rates.
This means: "If even the optimistic estimate (95th percentile) suggests size < 1, stop trying."

This is a **one-sided decision rule** (conservative: biased toward trying longer rather than stopping early).

**Hypotheses**:
- B1: When the decision rule triggers (95th percentile estimate < 1), the true size is < 1 in ≥95% of cases
  - **Rationale**: The 95th percentile should have 5% false positive rate by definition
- B2: False negative rate (continue trying when true size = 0) ≤ 50%
  - **Rationale**: Acceptable to waste effort on edge cases, but should terminate eventually
- B3: For filters with true size ≥ 10, early termination never triggers
  - **Rationale**: Decision rule should only stop for genuinely empty/tiny spaces

**Method**:
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

**Ground Truth Computation**:
- True size 0: `fc.integer(0, 99).filter(x => x > 200)` [impossible]
- True size 1: `fc.integer(0, 99).filter(x => x === 0)` [exactly one value]
- True size 5: `fc.integer(0, 99).filter(x => x < 5)` [exactly 5 values]
- etc.

**Statistical Power**:
- Effect size: Detect deviation of ±5% from target (e.g., 90% vs 95%)
- With n=500, 95% CI width ≈ ±4.4%, sufficient to detect ±5% deviation
- Power ≥80% for detecting meaningful miscalibration

**Edge Cases to Test**:
1. **Composed base size**: What if `baseSize` itself is estimated (tuple of filters)?
   - Current code uses `baseSize.value`, ignoring uncertainty
   - Should use `baseSize.credibleInterval[1]` (upper bound) for conservatism
   - Add hypothesis B4: Early termination on estimated base sizes is conservative
2. **Very rare filters** (0.01% pass rate): Does posterior converge before termination?
   - Add scenario with pass rate = 0.001 (1 in 1000)
   - Measure: average samples before termination
```

**Changes Required**:
1. Rewrite Study B hypotheses with correct statistical interpretation
2. Add edge case for estimated base sizes
3. Add scenario for very rare filters
4. Specify exact false positive/negative rate targets
5. Add power analysis

---

#### Issue #2: Study A - Sequential Testing Bias

**Location**: `ci-calibration-advanced.md` lines 28-40

**Problem Description**:
The proposed method samples incrementally (1, 5, 10, 25, 50, 100, 200 samples) and checks CI calibration **at each checkpoint within the same trial**. This creates multiple comparisons problem:

- If you test at 8 checkpoints with α=0.10 (acceptance threshold for 90% coverage)
- Probability of at least one false alarm ≈ 1 - (0.90)^8 ≈ 57%

Additionally, the checkpoints are **not independent** (sample 50 includes all of sample 25), violating statistical independence assumptions.

**Detailed Fix**:

```markdown
### Study A: Convergence Dynamics

**Question**: How quickly does the CI converge to its target coverage as samples accumulate?

**Hypotheses**:
- A1: Coverage ≥90% for all warmup counts ≥50
  - **Rationale**: Beta posterior converges quickly for moderate sample sizes
- A2: CI width decreases as O(1/√n) (theoretical convergence rate)
  - **Rationale**: Standard error of proportion estimate
- A3: Point estimate mean absolute error decreases as O(1/√n)
  - **Rationale**: Consistent estimator with standard convergence

**Method**:
1. **Independent Trials Design** (avoid sequential testing bias):
   - For each warmup count w ∈ {10, 25, 50, 100, 200, 500}:
     - Run 500 **independent** trials
     - Each trial: create fresh FilteredArbitrary, sample exactly w times, measure CI
   - Total: 6 × 500 = 3000 independent trials

2. **Scenarios**:
   - Pass rate ∈ {10%, 30%, 50%, 70%, 90%}
   - Base size = 1000 (large enough to ignore finite-population effects)

3. **Measurements per trial**:
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
   - Std absolute error = std(|estimated - true| / true)

5. **Convergence Analysis**:
   - Plot coverage vs warmup count (with 95% CI error bars)
   - Fit CI width ~ a/√w + b (test A2)
   - Fit MAE ~ c/√w + d (test A3)
   - Report R² for fits

**Statistical Power**:
- Per warmup count: n=500 trials
- 95% CI width ≈ ±4.4%
- Can detect if coverage < 85% or > 95% with power >80%

**Acceptance Criteria**:
- A1 passes if: coverage ≥ 85% for w ≥ 50 (conservative threshold to account for small sample sizes)
- A2 passes if: R² ≥ 0.90 for width ~ a/√w fit
- A3 passes if: R² ≥ 0.80 for MAE ~ c/√w fit

**Why This Matters**:
- FilteredArbitrary constructor uses 10 warmup samples
- If coverage is poor at w=10, we need to increase warmup
- If coverage good at w=50, we might reduce warmup for efficiency
- Convergence rate informs adaptive stopping criteria (Study H)
```

**Changes Required**:
1. Replace checkpoint design with independent trials per warmup count
2. Add explicit O(1/√n) convergence hypothesis with R² test
3. Add power analysis and sample size justification
4. Add acceptance criteria with statistical thresholds
5. Specify exact scenarios (pass rates, base sizes)

---

#### Issue #3: Study C - Intractable Ground Truth and Non-Determinism

**Location**: `ci-calibration-advanced.md` lines 64-84

**Problem Description**:

**Issue 3a**: The `isPrime(x)` filter requires counting primes up to N:
- For N=10,000, need prime sieve (expensive but doable)
- For N=1,000,000, computational cost increases significantly
- Introduces approximation error (Prime Number Theorem: π(N) ≈ N/ln(N) has ~5% error)

**Issue 3b**: The third example filter is **non-deterministic**:
```typescript
x => x > 500 || Math.random() < 0.1
```
This gives different results on repeated evaluation, violating the assumption that predicates are pure functions. The study would have undefined true size.

**Detailed Fix**:

```markdown
### Study C: Adversarial Filter Patterns

**Question**: Does CI calibration hold for non-uniform, structured filter patterns?

**Background**:
Real-world predicates often have structure:
- **Clustered acceptance**: Values passing filter are grouped together
- **Modular patterns**: Acceptance depends on value mod k
- **Magnitude-dependent**: Different pass rates for different value ranges
- **Bit-pattern dependent**: Acceptance depends on binary representation

These differ from uniform random filters (x => random() < p) used in basic studies.

**Hypotheses**:
- C1: Clustered acceptance maintains coverage ≥90%
- C2: Modular patterns maintain coverage ≥90%
- C3: Magnitude-dependent patterns maintain coverage ≥90%
- C4: Bit-pattern patterns maintain coverage ≥90%

**Scenarios** (all with computable ground truth):

1. **Clustered Acceptance** (10% overall pass rate):
   ```typescript
   // Pass rate 10%, but all passing values in first 10% of range
   fc.integer(0, 999).filter(x => x < 100)
   // True size: 100
   ```

2. **Modular Pattern** (~50% pass rate):
   ```typescript
   // Even numbers only
   fc.integer(0, 999).filter(x => x % 2 === 0)
   // True size: 500
   ```

3. **Magnitude-Dependent** (biased pass rate):
   ```typescript
   // High pass rate for small values, low for large
   fc.integer(0, 999).filter(x => x < 100 || (x >= 500 && x < 550))
   // True size: 100 + 50 = 150
   ```

4. **Bit-Pattern Dependent** (~50% pass rate):
   ```typescript
   // Even number of 1-bits in binary representation
   fc.integer(0, 1023).filter(x => popcount(x) % 2 === 0)
   // True size: 512 (known result for powers of 2)
   ```

5. **Hash-Based Pseudo-Random** (30% pass rate, deterministic):
   ```typescript
   fc.integer(0, 999).filter(x => ((x * 2654435761) >>> 0) % 100 < 30)
   // True size: ~300 (exact count via exhaustive enumeration)
   ```

**Ground Truth Computation**:
- For modular/clustered: analytical formula
- For bit-pattern: known mathematical result or small exhaustive count
- For hash-based: one-time exhaustive enumeration, cache result

**Method**:
1. For each scenario:
   - Run 500 trials
   - Each trial: fresh FilteredArbitrary, warmup 200 samples
   - Measure: true size (known), estimated size, CI, coverage
2. Aggregate coverage per scenario
3. Compare to baseline (uniform random filter with same pass rate)

**Statistical Power**:
- n=500 per scenario
- Can detect coverage < 85% with power >80%

**Why This Matters**:
- Real predicates have structure (e.g., `x > threshold`, `x.length < N`)
- Beta distribution assumes uniform random sampling
- Structured patterns may violate independence assumptions
- If coverage fails, need to document limitations or improve estimator
```

**Changes Required**:
1. Replace `isPrime` with modular/bit-pattern alternatives
2. Remove non-deterministic `Math.random()` filter entirely
3. Add hash-based pseudo-random filter (deterministic but appears random)
4. Specify exact ground truth for each scenario
5. Add baseline comparison to uniform random filter

---

#### Issue #4: Study D - Calibration vs Precision Conflation

**Location**: `ci-calibration-advanced.md` lines 89-104

**Problem Description**:

The hypotheses conflate two orthogonal properties:
1. **Calibration**: Does the CI contain the true value ~90% of the time?
2. **Precision**: How wide is the CI?

Hypothesis D3 "coverage degrades predictably with depth" is ambiguous:
- Does "degrade" mean coverage drops below 90%? (calibration failure)
- Or does it mean intervals get wider? (precision loss, but still calibrated)

Additionally, no mechanism is proposed for **why** degradation would occur. Interval arithmetic on independent intervals should be **conservative** (wider, not narrower), so coverage should stay ≥90% or increase.

**Detailed Fix**:

```markdown
### Study D: Composition Depth Impact

**Question**: How do calibration and precision change with composition depth?

**Background**:
When composing arbitraries, size CIs are propagated using interval arithmetic:
- **Products** (tuples): multiply bounds
- **Sums** (unions): add bounds

Theoretical result: If X and Y are independent with credible intervals [X_lo, X_hi] and [Y_lo, Y_hi], then:
- Product interval [X_lo × Y_lo, X_hi × Y_hi] has coverage ≥ min(coverage(X), coverage(Y))
  - Proof: P(X ∈ [X_lo, X_hi] AND Y ∈ [Y_lo, Y_hi]) ≥ P(X ∈ ...) + P(Y ∈ ...) - 1 (inclusion-exclusion)
  - For 90% intervals: coverage ≥ 0.9 + 0.9 - 1 = 0.8 (worst case)
  - Typically higher due to correlation in credible regions

With **composition depth** d, we multiply d independent intervals:
- **Calibration hypothesis**: Coverage should remain ≥90% (conservative)
- **Precision hypothesis**: Width grows exponentially with depth (product of widths)

**Hypotheses**:

**Calibration**:
- D1: Coverage ≥ 90% for all depths ≤ 5
  - **Rationale**: Interval arithmetic is conservative
- D2: Coverage does not exceed 99% for depth ≤ 5
  - **Rationale**: Excessive conservatism wastes precision

**Precision**:
- D3: Relative CI width grows sub-exponentially with depth
  - **Rationale**: If width_d = k^d (exponential), product becomes unusably wide
  - **Target**: width_d ≤ 2^d (doubling per level is acceptable)
- D4: Precision loss is within 2× of oracle (true Bayesian propagation)
  - **Rationale**: Interval arithmetic is simpler but should not be vastly worse

**Method**:

1. **Scenarios**:
   ```typescript
   // Depth 1: single filtered arbitrary
   fc.integer(0, 99).filter(x => x < 50)

   // Depth 2: tuple of two filtered arbitraries
   fc.tuple(
     fc.integer(0, 99).filter(x => x < 50),
     fc.integer(0, 99).filter(x => x < 50)
   )

   // Depth 3: tuple of depth-2 and depth-1
   fc.tuple(
     fc.tuple(
       fc.integer(0, 99).filter(x => x < 50),
       fc.integer(0, 99).filter(x => x < 50)
     ),
     fc.integer(0, 99).filter(x => x < 50)
   )

   // Depths 4, 5: continue nesting
   ```

2. **Ground Truth**:
   - Depth 1: 50
   - Depth 2: 50 × 50 = 2,500
   - Depth 3: 2,500 × 50 = 125,000
   - Depth 4: 6,250,000
   - Depth 5: 312,500,000

3. **Measurements** (per depth, 500 trials):
   - Coverage (true size ∈ CI)
   - Absolute CI width
   - Relative CI width = width / true_size
   - Width ratio = actual_width / oracle_width

4. **Oracle Baseline** (for D4):
   - Monte Carlo: Sample from Beta posteriors, multiply samples, compute 5th/95th percentiles
   - Compute for depths 1-3 (depths 4-5 too expensive)

**Statistical Power**:
- n=500 trials per depth
- 95% CI on coverage: ±4.4%
- Can detect coverage < 85% or > 95% with power >80%

**Acceptance Criteria**:
- D1 passes if: coverage ≥ 85% for all depths (5% margin for error)
- D2 passes if: coverage ≤ 99% for all depths
- D3 passes if: median(width_d / width_{d-1}) ≤ 2.0
- D4 passes if: median(width_ratio) ≤ 2.0 for depths 1-3

**Why This Matters**:
- Complex types have deep nesting (e.g., object with array of objects)
- If CIs become unusably wide (high precision loss), early termination fails
- If coverage drops below 90%, we make incorrect decisions
- Knowing the tradeoff informs whether to improve interval propagation
```

**Changes Required**:
1. Separate calibration hypotheses (D1, D2) from precision hypotheses (D3, D4)
2. Add mathematical rationale for conservatism
3. Define "degradation" quantitatively (width growth rate)
4. Add oracle baseline for precision comparison
5. Add statistical power and acceptance criteria

---

#### Issue #5: Study E - Shrinking Model Underspecified

**Location**: `ci-calibration-advanced.md` lines 108-122

**Problem Description**:

Looking at `FilteredArbitrary.ts:76-78`:
```typescript
return shrunkBase.filter(v => this.f(v))
```

This creates a **new** `FilteredArbitrary` with:
- Fresh `BetaDistribution(2, 1)` (cold start, no learned information)
- New warmup samples (10 from constructor)

**Issues**:
1. How to compute true size of shrunk space? (requires enumeration)
2. Should we warm up the shrunk arbitrary before checking CI?
3. Does the cold start cause CI to be miscalibrated?

**Detailed Fix**:

```markdown
### Study E: Shrinking with Filtered Arbitraries

**Question**: Does the shrunk FilteredArbitrary maintain CI calibration despite cold-start posterior?

**Background**:
When `shrink(pick)` is called on `FilteredArbitrary`, it returns:
```typescript
shrunkBase.filter(v => this.f(v))
```

This creates a **new** FilteredArbitrary with:
- Base arbitrary: `shrunkBase` (often smaller space)
- Same predicate: `this.f`
- Fresh posterior: `BetaDistribution(2, 1)` (no transfer of learned info)
- Constructor warmup: 10 samples

**Key Insight**: The shrunk space may have different pass rate than original.

Example:
```typescript
// Original: integer(0, 100).filter(x => x < 50)
// True size: 50, pass rate: 50%

// After shrinking value 75 → 37:
// Shrunk: integer(0, 37).filter(x => x < 50)
// True size: 38 (all values pass), pass rate: 100%
```

The pass rate can **increase** (if shrunk space is subset of passing region) or **stay same** (if predicate scales proportionally).

**Hypotheses**:
- E1: Shrunk FilteredArbitrary maintains ≥90% coverage after constructor warmup (10 samples)
  - **Rationale**: Constructor warmup sufficient for small shrunk spaces
- E2: Coverage ≥90% even when shrunk space has different pass rate than parent
  - **Rationale**: Beta posterior adapts to new pass rate quickly
- E3: Cold start does not cause systematic bias (mean error ≈ 0)
  - **Rationale**: Bias would indicate need for warm-start transfer (Study I)

**Method**:

1. **Scenarios with Known Shrunk Size**:
   ```typescript
   // Scenario 1: Shrunk space is subset of passing region (pass rate increases)
   const original = fc.integer(0, 100).filter(x => x < 50)  // 50% pass rate
   const shrunkPick = { value: 25, original: 25 }
   const shrunk = original.shrink(shrunkPick)
   // Shrunk space: integer(0, 25).filter(x => x < 50)
   // True size: 26, pass rate: 100%

   // Scenario 2: Shrunk space has same pass rate (predicate scales)
   const original2 = fc.integer(0, 100).filter(x => x % 2 === 0)  // 50% pass rate
   const shrunkPick2 = { value: 50, original: 50 }
   const shrunk2 = original2.shrink(shrunkPick2)
   // Shrunk space: integer(0, 50).filter(x => x % 2 === 0)
   // True size: 26, pass rate: ~50%
   ```

2. **Ground Truth**:
   - For small shrunk spaces (size ≤ 1000): exhaustive enumeration
   - Cache results for repeated scenarios

3. **Measurements** (500 trials per scenario):
   - True size of shrunk space (exhaustive count)
   - Estimated size (after constructor warmup)
   - CI bounds
   - Coverage (true ∈ CI)
   - Relative error ((estimated - true) / true)

4. **Warmup Sensitivity**:
   - Also test with additional warmup: 0, 50, 100 samples
   - Plot coverage vs additional warmup
   - Determine minimum warmup for ≥90% coverage

**Statistical Power**:
- n=500 trials per scenario
- 95% CI on coverage: ±4.4%
- Can detect coverage < 85% with power >80%

**Acceptance Criteria**:
- E1 passes if: coverage ≥ 85% with just constructor warmup (10 samples)
- E2 passes if: coverage ≥ 85% for both pass-rate-change scenarios
- E3 passes if: |mean(relative_error)| < 0.10 (less than 10% bias)

**Why This Matters**:
- Shrinking is iterative (many shrink calls per counterexample)
- If shrunk CI is miscalibrated, we might:
  - Stop shrinking prematurely (miss simpler counterexample)
  - Shrink too aggressively (waste time on empty spaces)
- If coverage poor with 10 warmup, need to increase or implement warm-start (Study I)
```

**Changes Required**:
1. Specify exact shrink scenarios with computable true sizes
2. Add ground truth computation method (exhaustive for small spaces)
3. Add warmup sensitivity analysis
4. Document cold-start issue explicitly
5. Add connection to Study I (warm-start alternative)

---

#### Issue #6: Study F - Implementation Not Found

**Location**: `ci-calibration-advanced.md` lines 126-141

**Problem Description**:
Study F refers to "ChainedArbitrary" for `flatMap` dependencies, but grep of codebase shows no `ChainedArbitrary` class. Need to verify:
1. Does `flatMap` exist?
2. If so, what is the implementation?
3. How does it propagate size estimates?

**Detailed Fix**:

```markdown
### Study F: flatMap (ChainedArbitrary) Dependencies

**Status**: PENDING VERIFICATION

**Implementation Check Required**:
```bash
# Search for flatMap implementation
grep -r "flatMap" src/
grep -r "ChainedArbitrary" src/
grep -r "class.*Chained" src/
```

**If flatMap exists**:
- Proceed with study as designed
- Document size propagation mechanism
- Test CI behavior with dependent arbitraries

**If flatMap does not exist**:
- Mark study as "FUTURE WORK"
- Create GitHub issue: "Implement flatMap with size estimation"
- Remove from current evidence suite

**Provisional Study Design** (contingent on implementation):

**Question**: How does CI behave when arbitraries have dependencies via flatMap?

**Background**:
`flatMap` creates dependent arbitraries:
```typescript
fc.integer(1, 10).flatMap(n => fc.array(fc.integer(0, 99), n, n))
```

The array length depends on the first integer. The size is:
```
size = sum over n=1..10 of (1 × 100^n)
```

This is **not** a simple product because the distribution is non-uniform.

**Key Question**: How does size estimation handle this dependency?

**Possible Implementations**:
1. **Conservative upper bound**: Assume all dependencies maximize size
   ```
   upper_bound = baseSize × max(dependentSize over all base values)
   ```
2. **Expected value**: Weight by probability of each base value
   ```
   expected = sum over base values of (P(base) × size(dependent | base))
   ```

**Hypotheses** (assuming conservative upper bound):
- F1: Upper CI bound is always valid (true size ≤ upper bound)
  - **Rationale**: Conservative approach should never underestimate
- F2: Coverage ≥ 90% (CI contains true value)
  - **Rationale**: Conservatism preserves calibration
- F3: CI width is ≤ 5× wider than oracle
  - **Rationale**: Conservatism has cost, but should be reasonable

**Method** (if implementation exists):
1. Create flatMap scenarios with known true size
2. Measure estimated size and CI
3. Compare to exhaustive enumeration (for small spaces)
4. Compute coverage and precision metrics

**Next Steps**:
1. Verify implementation exists
2. Document size propagation algorithm
3. Run preliminary test to check basic behavior
4. Proceed with full study or mark as future work
```

**Changes Required**:
1. Add implementation verification step
2. Add "PENDING" status to study
3. Add conditional next steps
4. Create GitHub issue if implementation missing

---

#### Issue #7: Beta(2,1) Prior Unjustified

**Location**: `FilteredArbitrary.ts` line 11, code comment contradicts implementation

**Problem Description**:

Code:
```typescript
this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
```

**Contradictions**:
1. Comment says "use 1,1" but code uses (2,1)
2. Comment mentions "mean vs mode" but doesn't explain why this matters
3. No justification for why (2,1) is preferred

**Analysis**:
- Beta(1,1) = Uniform(0,1) = non-informative prior (no bias)
- Beta(2,1) has mode at 1.0, mean at 2/3 (biased toward high pass rates)
- Beta(0.5, 0.5) = Jeffreys prior (scale-invariant, reference prior for Bernoulli)

**Effect on point estimate**:
- If using **mode**: Beta(1,1) mode is undefined (uniform), Beta(2,1) mode = 1.0
- If using **mean**: Beta(1,1) mean = 0.5, Beta(2,1) mean = 2/3

Looking at `FilteredArbitrary.ts:45`:
```typescript
Math.round(v * this.sizeEstimation.mode())
```

So it **does** use mode, and the (2,1) prior ensures mode is well-defined.

**But**: The (2,1) prior creates **optimistic bias** (expects high pass rates), which might delay early termination unnecessarily.

**Detailed Fix**:

```markdown
### Beta Prior Selection

**Current Implementation**:
```typescript
this.sizeEstimation = new BetaDistribution(2, 1)
```

**Problem**:
1. Code comment contradicts implementation (says 1,1, uses 2,1)
2. No justification documented
3. Creates optimistic bias toward high pass rates

**Options**:

**Option 1: Keep Beta(2,1) with Justification**
```typescript
// Beta(2,1) prior: mode=1.0, mean=2/3
// - Ensures mode() is well-defined (Beta(1,1) mode is undefined)
// - Optimistic bias: assume filters pass most values initially
// - Rationale: Filters that pass few values terminate early anyway,
//   so optimistic prior has minimal cost. Filters that pass many values
//   benefit from accurate estimation, so optimistic prior helps.
this.sizeEstimation = new BetaDistribution(2, 1)
```

**Option 2: Switch to Beta(1,1) and Use Mean**
```typescript
// Beta(1,1) = Uniform prior (non-informative)
// Use mean instead of mode for point estimate
// - mean() is well-defined for Beta(1,1): mean = 0.5
// - No bias toward high or low pass rates
this.sizeEstimation = new BetaDistribution(1, 1)
// In size() method:
Math.round(v * this.sizeEstimation.mean())  // not mode()
```

**Option 3: Use Jeffreys Prior Beta(0.5, 0.5)**
```typescript
// Beta(0.5, 0.5) = Jeffreys prior (reference prior for Bernoulli)
// - Scale-invariant (no bias)
// - mode = 0.5 (well-defined)
// - Established Bayesian standard
this.sizeEstimation = new BetaDistribution(0.5, 0.5)
```

**Recommendation**: Add Study A.4 to empirically compare priors

**Study A.4: Beta Prior Comparison**

**Question**: Does the choice of Beta prior affect CI calibration or point estimate accuracy?

**Method**:
1. Test priors: Beta(0.5, 0.5), Beta(1, 1), Beta(2, 1), Beta(2, 2)
2. Scenarios: pass rates 10%, 30%, 50%, 70%, 90%
3. Warmup: 200 samples
4. Measure:
   - Coverage (should be ~90% for all priors)
   - Mean absolute error (prefer lower)
   - Median CI width (prefer narrower if coverage maintained)

**Expected Results**:
- All priors should achieve ~90% coverage (asymptotic result)
- Priors differ in **small-sample behavior** (before convergence)
- Beta(1,1) likely has least bias
- Beta(2,1) might have larger error for low-pass-rate filters

**Acceptance Criteria**:
- If all priors achieve coverage ≥85%, choose based on:
  1. Lowest mean absolute error
  2. Narrowest median CI width
  3. Theoretical justification (Jeffreys prior preferred if ties)
- If a prior has coverage <85%, reject it

**Implementation**:
1. Modify FilteredArbitrary to accept optional prior parameter
2. Run study
3. Document choice in code with reference to study results
```

**Changes Required**:
1. Fix code comment to match implementation
2. Add Study A.4 to compare priors empirically
3. Document final choice with reference to study results OR theoretical justification
4. If keeping (2,1), explain optimistic bias rationale

---

### UNEXPLAINED ASSUMPTIONS

#### Issue #8: Warmup Sample Sizes Arbitrary

**Location**: `FilteredArbitrary.ts:16` (warmup=10), `ci-calibration.study.ts:152-302` (warmup=200)

**Problem Description**:
- Constructor uses 10 warmup samples
- Basic study uses 200 warmup samples
- No justification for either choice
- No analysis of sensitivity to warmup count

**Detailed Fix**:

Integrate into **Study A** (Convergence Dynamics), which already tests different warmup counts.

**Study A.5: Warmup Recommendation**

Add to Study A analysis:

```python
# In analysis/ci_calibration.py

def recommend_warmup(df):
    """
    Determine minimum warmup count for 90% coverage.

    Finds the smallest warmup count w such that:
    - Coverage ≥ 90% (lower bound of 95% CI)
    - Mean absolute error < 20%
    - Median CI width < 50% of true size
    """
    results = []
    for warmup in sorted(df['warmup_count'].unique()):
        subset = df[df['warmup_count'] == warmup]

        # Coverage with Wilson score interval
        n = len(subset)
        successes = subset['true_in_ci'].sum()
        coverage, (ci_lo, ci_hi) = wilson_score_interval(successes, n)

        # Error metrics
        mae = subset['relative_error'].mean()
        median_width = subset['ci_relative_width'].median()

        results.append({
            'warmup': warmup,
            'coverage': coverage,
            'coverage_ci_lo': ci_lo,
            'mae': mae,
            'median_width': median_width,
            'passes': ci_lo >= 0.90 and mae < 0.20 and median_width < 0.50
        })

    results_df = pd.DataFrame(results)

    # Find minimum passing warmup
    passing = results_df[results_df['passes']]
    if len(passing) > 0:
        recommended = passing.iloc[0]['warmup']
        print(f"\n=== Warmup Recommendation ===")
        print(f"Minimum warmup for 90% coverage: {recommended}")
        print(f"Current constructor warmup: 10")
        print(f"Current study warmup: 200")
        if recommended > 10:
            print(f"⚠️  RECOMMENDATION: Increase constructor warmup to {recommended}")
        else:
            print(f"✓ Constructor warmup (10) is sufficient")
    else:
        print(f"⚠️  WARNING: No warmup count meets all criteria")

    return results_df
```

**Documentation Addition**:

In `ci-calibration.md`, add section:

```markdown
## Warmup Sample Size Selection

**Current Values**:
- Constructor (FilteredArbitrary.ts:16): 10 samples
- Studies (ci-calibration.study.ts): 200 samples

**Empirical Justification** (from Study A):

| Warmup Count | Coverage | MAE | Median CI Width | Passes Criteria? |
|--------------|----------|-----|-----------------|------------------|
| 10 | [result] | [result] | [result] | [✓/✗] |
| 25 | [result] | [result] | [result] | [✓/✗] |
| 50 | [result] | [result] | [result] | [✓/✗] |
| 100 | [result] | [result] | [result] | [✓/✗] |
| 200 | [result] | [result] | [result] | [✓/✗] |

**Criteria for Passing**:
- Coverage (lower 95% CI) ≥ 90%
- Mean absolute error < 20%
- Median CI width < 50% of true size

**Recommendation**: [Based on results]

**Tradeoff**:
- **Lower warmup**: Faster arbitrary creation, but less accurate initial size estimates
- **Higher warmup**: More accurate, but slower construction (matters for large filter chains)

**Decision**: [Document final choice with rationale]
```

**Changes Required**:
1. Add warmup recommendation analysis to Study A
2. Document current values and criteria
3. Update constructor warmup if study recommends change
4. Add comment in code referencing study results

---

#### Issue #9: Interval Arithmetic Conservatism Unproven

**Location**: `ci-calibration.md:87-89`, multiple places in advanced doc

**Problem Description**:
Claim: "Product and Sum CIs are conservative: Coverage rates of ~97-98% exceed the target 90%."

This is empirical observation from 8 scenarios. Need:
1. Mathematical proof or citation
2. Analysis of when conservatism might fail (e.g., correlation)

**Detailed Fix**:

Add to `ci-calibration.md`:

```markdown
## Mathematical Foundations of Interval Arithmetic

### Theorem: Interval Arithmetic Preserves Coverage (Independent Case)

**Statement**: If X and Y are independent random variables with credible intervals [X_lo, X_hi] and [Y_lo, Y_hi] at coverage level α, then:
- Product interval [X_lo × Y_lo, X_hi × Y_hi] has coverage ≥ α² (potentially conservative)
- Sum interval [X_lo + Y_lo, X_hi + Y_hi] has coverage ≥ α² (potentially conservative)

**Proof (Product)**:

Let p_X = P(X ∈ [X_lo, X_hi]) = α and p_Y = P(Y ∈ [Y_lo, Y_hi]) = α.

For the product X × Y to fall within [X_lo × Y_lo, X_hi × Y_hi], we need **both** X ∈ [X_lo, X_hi] **and** Y ∈ [Y_lo, Y_hi] (assuming positive values).

By independence:
```
P(X ∈ [X_lo, X_hi] AND Y ∈ [Y_lo, Y_hi]) = P(X ∈ [X_lo, X_hi]) × P(Y ∈ [Y_lo, Y_hi])
                                            = α × α
                                            = α²
```

For α = 0.90, this gives coverage ≥ 0.81 (81%).

**Why is observed coverage higher (~97%)?**

The above is a **lower bound** (worst case). In practice, coverage is higher because:
1. The product interval is **wider** than the minimum necessary
2. The true product distribution is more concentrated than the corners suggest
3. Bayesian credible intervals have **simultaneous coverage** properties

**Empirical Observation**: Basic study shows ~97% coverage for products, consistent with theory (≥81% guaranteed, ~97% achieved).

**Proof (Sum)**: Similar reasoning applies.

### Correlation Effects

**Open Question**: Does interval arithmetic remain conservative under **correlation**?

Example of potential failure:
```typescript
// Scenario: Two filters on the same base value (correlated)
const base = fc.integer(0, 100)
const arb1 = base.filter(x => x > 30)  // True size: 70
const arb2 = base.filter(x => x < 70)  // True size: 70

// If we naively compute:
// Union size ≈ 70 + 70 = 140
// But true union size could be less if intervals overlap!
```

**Mitigation in Current Code**:
- Composites use **disjoint** arbitraries (different ranges)
- Tuples with correlated components are rare in practice

**Future Work**: Study K (Correlation in Composition) will test this empirically.

### Citations

**Interval Arithmetic**:
- Moore, R. E., Kearfott, R. B., & Cloud, M. J. (2009). *[Introduction to Interval Analysis](https://epubs.siam.org/doi/book/10.1137/1.9780898717716)*. SIAM. ISBN 978-0-898716-69-6. DOI: [10.1137/1.9780898717716](https://doi.org/10.1137/1.9780898717716)
  - Chapter 3: "Interval Arithmetic for Functions of Several Variables"

**Bayesian Credible Intervals**:
- Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). *[Bayesian Data Analysis](https://www.routledge.com/Bayesian-Data-Analysis/Gelman-Carlin-Stern-Dunson-Vehtari-Rubin/p/book/9781439840955)* (3rd ed.). Chapman and Hall/CRC. ISBN 978-1-439-84095-5.
  - Chapter 2.3: "Bayesian Inference for the Binomial Model"

**Independence Assumption**:
- Current implementation assumes independence (arbitraries sample from different generators)
- Correlation requires joint distribution analysis (future work)
```

**Changes Required**:
1. Add mathematical proof of conservatism for independent intervals
2. Add citations to interval arithmetic and Bayesian statistics literature
3. Document correlation as open question
4. Reference Study K for empirical validation

---

#### Issue #10: Arbitrary Thresholds (99%, 10%)

**Location**: Hypothesis H4 (99% threshold), Study G (10% threshold)

**Problem Description**:
- H4: "Coverage ≤ 99%" - why is 99% "excessive" but 97% acceptable?
- Study G: "Selection probability within 10%" - ignores sampling variance

**Detailed Fix**:

**H4 Replacement**:

```markdown
### Hypothesis H4: Interval Efficiency

**Original** (vague):
- H4: Coverage ≤ 99% (not excessively conservative)

**Revised** (precise):
- H4a: Mean CI width is ≤ 2.0× oracle width (interval arithmetic acceptable precision)
- H4b: Precision loss ≤ 30% (median CI width / true size < 0.30)

**Rationale**:
- **Efficiency** = narrow intervals while maintaining coverage
- "Excessive conservatism" is vague; "2× wider than optimal" is precise
- Oracle = Monte Carlo from Beta posteriors (true Bayesian propagation)
- 30% relative width is practical threshold (size estimates still useful)

**Method**:
1. Compute oracle CI for filtered arbitraries:
   ```python
   # Monte Carlo from Beta posterior
   samples = beta.rvs(alpha, beta, size=10000)
   oracle_lo = np.percentile(samples, 5)
   oracle_hi = np.percentile(samples, 95)
   ```
2. Compare interval arithmetic width to oracle width
3. Compute width ratio = actual_width / oracle_width
4. Check: median(width_ratio) ≤ 2.0

**Acceptance**:
- H4a passes if: median(width_ratio) ≤ 2.0 for depth ≤ 3
- H4b passes if: median(ci_width / true_size) ≤ 0.30 for all scenarios
```

**Study G Replacement**:

```markdown
### Study G: Weighted Union Selection

**Original Hypothesis** (statistically invalid):
- G1: Selection probability matches size ratio within 10%

**Problem**:
With 1000 samples and union sizes [1000, 10], expected selections:
- Large: 1000/1010 × 1000 ≈ 990
- Small: 10/1010 × 1000 ≈ 10

With binomial sampling variance:
- Small std ≈ √(1000 × 0.01 × 0.99) ≈ 3.15
- Small 95% CI ≈ [4, 16] = [0.4%, 1.6%] actual rate
- Relative error: up to ±60% just from sampling noise!

The "10% threshold" would **falsely reject** correct implementations.

**Revised Hypotheses** (statistically valid):

- G1: Chi-squared goodness-of-fit test p-value ≥ 0.05
  - **Rationale**: Standard statistical test for comparing observed vs expected frequencies
- G2: Observed selection rates are within 95% confidence intervals of expected rates
  - **Rationale**: Accounts for sampling variance properly
- G3: Effect size (Cohen's h) < 0.2 (small effect)
  - **Rationale**: Even if statistically significant, effect should be practically small

**Method**:

```python
def test_weighted_selection(samples, expected_weights):
    """
    Test if weighted sampling matches expected proportions.

    Uses chi-squared goodness-of-fit test.
    """
    observed = np.bincount(samples)
    expected = np.array(expected_weights) / sum(expected_weights) * len(samples)

    # Chi-squared test
    chi2_stat = np.sum((observed - expected)**2 / expected)
    df = len(expected) - 1
    p_value = 1 - chi2.cdf(chi2_stat, df)

    # Effect size (Cohen's h for proportions)
    observed_props = observed / len(samples)
    expected_props = expected / len(samples)
    cohens_h = 2 * np.arcsin(np.sqrt(observed_props)) - 2 * np.arcsin(np.sqrt(expected_props))
    effect_size = np.linalg.norm(cohens_h)

    return {
        'chi2_stat': chi2_stat,
        'p_value': p_value,
        'effect_size': effect_size,
        'passes': p_value >= 0.05 and effect_size < 0.2
    }
```

**Sample Size**:
- For union with sizes [1000, 100, 10] (total 1110)
- Smallest category has expected count: n × (10/1110)
- For chi-squared to be valid, need expected count ≥ 5
- Minimum n = 5 × (1110/10) = 555

**Use n = 10,000** to ensure adequate power for detecting small deviations.

**Acceptance Criteria**:
- G1 passes if: p_value ≥ 0.05 (fail to reject null hypothesis of correct weighting)
- G2 passes if: all observed rates within 95% CI of expected
- G3 passes if: Cohen's h < 0.2 (effect size is small)
```

**Changes Required**:
1. Replace H4 with precision-based hypotheses (width ratio, relative width)
2. Replace Study G arbitrary threshold with chi-squared test
3. Add sample size justification for Study G
4. Add effect size analysis (Cohen's h)

---

### INSUFFICIENT EVIDENCE

#### Issue #11: Depth-2 vs Depth-3 Anomaly

**Location**: `ci-calibration.md:92-93`

**Problem Description**:
Claim: "Depth-2 chains show 86.6% coverage (slightly below target), while depth-3 chains show 95.6%."

This is **counterintuitive** (coverage should decrease or stay same, not increase with depth). Possible causes:
1. Statistical noise (n=1000 might not be enough)
2. Bug in depth-2 scenario code
3. Non-monotonic convergence
4. Confounding variable

**Detailed Fix**:

Add to `ci-calibration.md`:

```markdown
## Investigation: Filter Chain Coverage Anomaly

### Observed Behavior

| Depth | Coverage | 95% CI | N |
|-------|----------|--------|---|
| 2 | 86.6% | [84.3%, 88.7%] | 1000 |
| 3 | 95.6% | [94.1%, 96.8%] | 1000 |

**Anomaly**: Coverage **increases** from depth-2 to depth-3, contrary to expectation that deeper chains should have wider intervals (more conservative, higher coverage) **or** degraded calibration (lower coverage).

### Hypotheses

**H1: Statistical Noise**
- With n=1000, 95% CI width ≈ ±2.1%
- 86.6% is ~1.6σ below target (90%)
- Possible false alarm (Type I error)

**Test**: Re-run with n=10,000 to reduce noise

**H2: Code Bug in Depth-2 Scenario**
- Depth-2 scenario might have implementation error
- Check: filter composition, ground truth calculation, warmup count

**Test**: Manual code review, add debug logging

**H3: Pass Rate Interaction**
- Both depths use 70% pass rate per layer
- Depth-2: 0.7² = 49% overall
- Depth-3: 0.7³ = 34% overall
- Hypothesis: Beta posterior converges differently at different pass rates

**Test**: Run depth-2 and depth-3 with same **overall** pass rate (not same per-layer rate)

**H4: Warmup Insufficient for Depth-2**
- Depth-2 uses 300 warmup samples
- Maybe depth-2 needs more warmup than depth-3 due to intermediate posterior?

**Test**: Vary warmup count for depth-2 (100, 300, 500, 1000)

### Follow-Up Study

**Method**:
1. **Increase sample size**: n=10,000 for both depths
2. **Add intermediate depths**: Test depths 1, 2, 3, 4, 5 to see trend
3. **Vary warmup**: Test warmup ∈ {100, 200, 300, 500, 1000} for each depth
4. **Vary pass rate**: Test per-layer pass rates ∈ {50%, 70%, 90%}
5. **Add debug metrics**:
   - Alpha/beta values of posterior at each depth
   - Posterior mean, mode, variance
   - CI width at each checkpoint

**Expected Results**:

If **H1 (noise)**:
- With n=10,000, both depths show coverage ≈ 90% ± 1%

If **H2 (bug)**:
- After fixing bug, depth-2 coverage ≈ 90%

If **H3 (pass rate)**:
- Coverage varies systematically with overall pass rate
- Depth-2 and depth-3 converge when overall pass rate matched

If **H4 (warmup)**:
- Depth-2 coverage improves with more warmup

**Acceptance Criteria**:
- Anomaly explained (one hypothesis confirmed)
- If noise: document as statistical artifact, no action needed
- If bug: fix code and re-run study
- If pass rate effect: document interaction, adjust scenarios
- If warmup: increase warmup for filter chains

### Recommendation

**Immediate**: Re-run with n=10,000 (low cost, rules out H1)
**If anomaly persists**: Code review (medium cost, rules out H2)
**If still unexplained**: Full follow-up study (high cost, but necessary for confidence)
```

**Changes Required**:
1. Add anomaly investigation section to ci-calibration.md
2. Re-run basic study with n=10,000 for filter chains
3. If anomaly persists, conduct full follow-up study
4. Document root cause and resolution

---

#### Issue #12: No Power Analysis

**Location**: All proposed studies

**Problem Description**:
None of the studies justify their sample sizes (500-1000 trials). Need to show:
- What effect size can we detect?
- What is the statistical power?
- Are the sample sizes adequate?

**Detailed Fix**:

Add to every study a "Statistical Power" section:

**Template**:

```markdown
### Statistical Power Analysis

**Primary Hypothesis**: [e.g., H1: Coverage ≥ 90%]

**Effect Size of Interest**:
- Detect if true coverage is ≤ 85% (5% below target)
- This represents meaningful miscalibration

**Sample Size Calculation**:

For testing proportion p with null hypothesis p₀ = 0.90:
- Alternative hypothesis: p₁ = 0.85
- Effect size (Cohen's h): h = 2 × |arcsin(√p₁) - arcsin(√p₀)|
  ```
  h = 2 × |arcsin(√0.85) - arcsin(√0.90)| ≈ 0.155 (small-medium)
  ```
- Desired power: 1 - β = 0.80 (80% power)
- Significance level: α = 0.05 (two-sided)

Using normal approximation for proportion test:
```
n = (Z_α/2 + Z_β)² × [p₀(1-p₀) + p₁(1-p₁)] / (p₀ - p₁)²
  = (1.96 + 0.84)² × [0.90×0.10 + 0.85×0.15] / (0.05)²
  = 7.84 × 0.2175 / 0.0025
  = 682
```

**Recommendation**: Use **n = 500** per scenario (conservative)
- Achieves **~75% power** for detecting 5% deviation
- Tradeoff: computational cost vs statistical power
- 95% CI width ≈ ±4.4% (acceptable precision)

**For Study G** (chi-squared test):
- Smallest category must have expected count ≥ 5
- With sizes [1000, 100, 10], need n ≥ 555
- **Use n = 10,000** for adequate power

**Confidence Interval Width**:

For observed coverage p̂ from n trials:
- Wilson score 95% CI width ≈ 2 × 1.96 × √[p̂(1-p̂)/n]
- For p̂ = 0.90, n = 500: width ≈ ±4.4%
- This allows distinguishing 90% from 85% or 95%

**Power Curve**:
[Include plot of power vs true coverage for n=500]
- 80% power at p=0.85
- 95% power at p=0.82
- 50% power at p=0.87

**Interpretation**:
- If coverage estimate is 87%, we **cannot confidently reject** 90% (insufficient power)
- If coverage estimate is 85%, we **can reject** 90% with 80% power
- If coverage estimate is 92%, we **cannot reject** 90% (within noise)

**Conclusion**: n=500 is adequate for detecting **meaningful** deviations (≥5%), but not for detecting **subtle** deviations (≤2%).
```

**Changes Required**:
1. Add power analysis to every study
2. Justify sample size choices
3. Report 95% CIs on all coverage estimates (not just point estimates)
4. Add power curve plots to analysis scripts

---

#### Issue #13: No Outlier Detection

**Location**: All studies

**Problem Description**:
Current studies report mean/median coverage, which hides extreme miscalibrations. A single trial with true size = 1000 but CI = [1, 10] would be masked by aggregate statistics.

**Detailed Fix**:

Add to all analysis scripts:

```python
def detect_outliers(df, true_size_col='true_size', ci_lower_col='ci_lower', ci_upper_col='ci_upper'):
    """
    Detect and report outlier trials with extreme CI errors.

    Outliers are trials where:
    1. True value is >2σ outside the CI (assuming CI should contain it)
    2. CI width is >5× the median width (abnormally wide)
    3. Point estimate error is >3× the median error (abnormally inaccurate)
    """
    outliers = []

    # Calculate CI coverage errors
    df['lower_error'] = df[true_size_col] - df[ci_lower_col]
    df['upper_error'] = df[ci_upper_col] - df[true_size_col]
    df['ci_width'] = df[ci_upper_col] - df[ci_lower_col]
    df['relative_width'] = df['ci_width'] / df[true_size_col]

    # Detect extreme CI misses
    # If true value below lower bound by >2 standard errors
    median_lower_error = df['lower_error'].median()
    std_lower_error = df['lower_error'].std()
    extreme_low = df['lower_error'] < median_lower_error - 2 * std_lower_error

    # If true value above upper bound by >2 standard errors
    median_upper_error = df['upper_error'].median()
    std_upper_error = df['upper_error'].std()
    extreme_high = df['upper_error'] < median_upper_error - 2 * std_upper_error

    # Detect abnormally wide intervals
    median_width = df['relative_width'].median()
    extreme_wide = df['relative_width'] > 5 * median_width

    # Detect abnormally large errors
    median_error = df['relative_error'].median()
    extreme_error = df['relative_error'] > 3 * median_error

    # Combine
    outlier_mask = extreme_low | extreme_high | extreme_wide | extreme_error
    outlier_df = df[outlier_mask]

    if len(outlier_df) > 0:
        print(f"\n=== OUTLIER DETECTION ===")
        print(f"Found {len(outlier_df)} outlier trials ({100*len(outlier_df)/len(df):.2f}%)")
        print("\nTop 10 most extreme outliers:")
        print(outlier_df.nlargest(10, 'relative_error')[[
            'trial_id', 'scenario', 'true_size', 'estimated_size',
            'ci_lower', 'ci_upper', 'relative_error'
        ]])

        # Save outliers for investigation
        outlier_df.to_csv('docs/evidence/raw/outliers.csv', index=False)
        print("\nSaved outliers to docs/evidence/raw/outliers.csv")
    else:
        print("\n✓ No outliers detected")

    return outlier_df

# Add to each analysis script:
outliers = detect_outliers(df)
```

**Add to documentation**:

```markdown
## Outlier Analysis

**Definition**: Outliers are trials where CI behaves abnormally:
1. True value >2σ outside CI bounds
2. CI width >5× median width (abnormally conservative)
3. Point estimate error >3× median error

**Results**:

| Study | Outliers | % of Trials | Max Error | Investigation |
|-------|----------|-------------|-----------|---------------|
| ci-calibration | [N] | [%] | [error] | [explanation] |

**Outlier Investigation**:
[For each outlier, explain root cause or document as unexplained anomaly]

**Recommendation**:
- If <1% outliers: acceptable (random noise)
- If 1-5% outliers: investigate root cause
- If >5% outliers: serious calibration problem
```

**Changes Required**:
1. Add outlier detection function to all analysis scripts
2. Save outliers to separate CSV for investigation
3. Report outlier counts and maximum errors in documentation
4. Investigate and explain significant outliers

---

#### Issue #14: No Baseline Comparisons

**Location**: All studies

**Problem Description**:
We know CIs are ~92% calibrated, but is this **good**? Need baselines:
1. Naive: no intervals (coverage = 0%)
2. Pessimistic: always use [0, baseSize] (coverage = 100%)
3. Oracle: true Bayesian propagation (optimal)

**Detailed Fix**:

Add to `ci-calibration.study.ts`:

```typescript
/**
 * Baseline implementations for comparison
 */

// Baseline 1: Naive (point estimate only, no interval)
function naiveSize(arb: fc.Arbitrary<unknown>): { value: number, ci: [number, number] } {
  const size = arb.size()
  return { value: size.value, ci: [size.value, size.value] }
}

// Baseline 2: Pessimistic (always maximum uncertainty)
function pessimisticSize(arb: fc.Arbitrary<unknown>): { value: number, ci: [number, number] } {
  const size = arb.size()
  const baseValue = size.value
  return { value: baseValue, ci: [0, baseValue * 10] }  // 10× for safety
}

// Baseline 3: Oracle (Monte Carlo from Beta posterior)
function oracleSize(
  alpha: number,
  beta: number,
  baseSize: number,
  samples: number = 10000
): { value: number, ci: [number, number] } {
  // Sample from Beta(alpha, beta) and compute quantiles
  const generator = mulberry32(0xCAFE)
  const betaSamples: number[] = []

  for (let i = 0; i < samples; i++) {
    betaSamples.push(sampleBeta(alpha, beta, generator))
  }

  betaSamples.sort((a, b) => a - b)
  const lo = betaSamples[Math.floor(samples * 0.05)]
  const hi = betaSamples[Math.floor(samples * 0.95)]
  const median = betaSamples[Math.floor(samples * 0.50)]

  return {
    value: Math.round(baseSize * median),
    ci: [Math.floor(baseSize * lo), Math.ceil(baseSize * hi)]
  }
}

// Add to study scenarios:
for (const baseline of ['current', 'naive', 'pessimistic', 'oracle']) {
  // Run trials with each baseline
  // Compare coverage, width, efficiency
}
```

Add to analysis:

```python
def compare_baselines(df):
    """
    Compare current CI method to baselines.
    """
    baselines = ['current', 'naive', 'pessimistic', 'oracle']
    results = []

    for bl in baselines:
        subset = df[df['baseline'] == bl]
        coverage = subset['true_in_ci'].mean()
        median_width = subset['ci_width'].median()
        median_relative_width = (subset['ci_width'] / subset['true_size']).median()

        results.append({
            'baseline': bl,
            'coverage': coverage,
            'median_width': median_width,
            'relative_width': median_relative_width,
            'efficiency': coverage / (1 + median_relative_width)  # Higher is better
        })

    results_df = pd.DataFrame(results)

    print("\n=== Baseline Comparison ===")
    print(results_df.to_string(index=False))

    # Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    ax1.bar(results_df['baseline'], results_df['coverage'])
    ax1.axhline(0.90, color='red', linestyle='--', label='Target (90%)')
    ax1.set_ylabel('Coverage')
    ax1.set_title('Coverage by Baseline')
    ax1.legend()

    ax2.bar(results_df['baseline'], results_df['relative_width'])
    ax2.set_ylabel('Relative CI Width (width / true size)')
    ax2.set_title('Precision by Baseline')

    plt.tight_layout()
    plt.savefig('docs/evidence/figures/ci-calibration-baselines.png', dpi=300)

    return results_df
```

Add to documentation:

```markdown
## Baseline Comparison

To contextualize the current CI method, we compare against:

**Naive**: Point estimate only (no interval)
- Coverage: [result]
- Width: 0 (no uncertainty)
- Useless for decision-making

**Pessimistic**: Always use [0, 10× baseSize]
- Coverage: [result] (should be 100%)
- Width: [result] (very wide)
- Too conservative to be useful

**Current**: Beta posterior + interval arithmetic
- Coverage: [result] (target: 90%)
- Width: [result]
- Practical balance

**Oracle**: Monte Carlo from Beta posterior (optimal Bayesian)
- Coverage: [result] (should be ≈90%)
- Width: [result] (narrowest possible while maintaining coverage)
- Computationally expensive

**Efficiency Metric**: coverage / (1 + relative_width)
- Rewards high coverage and narrow intervals
- Current: [score]
- Oracle: [score]
- Ratio: [current/oracle] (closeness to optimal)

**Conclusion**:
- Current method is [X]× less efficient than oracle
- But [Y]× faster to compute
- Tradeoff is [acceptable/needs improvement]
```

**Changes Required**:
1. Implement baseline methods
2. Add baseline scenarios to studies
3. Plot baseline comparison
4. Document efficiency metric
5. Quantify current method vs oracle gap

---

(Continuing with remaining issues in next section due to length...)

### LACK OF CLARITY

#### Issue #15: Terminology Conflation

**Problem**: "Coverage" used for both calibration and width.

**Fix**: Add glossary to all documentation:

```markdown
## Glossary

**Coverage**: The proportion of trials where the true value falls within the credible interval.
- Example: "Coverage = 92%" means 92% of trials have true size ∈ [CI_lower, CI_upper]
- Target: 90% (from significance level)
- **Calibration** is a synonym (well-calibrated = coverage ≈ target)

**Precision**: How narrow the credible interval is.
- Measured as: CI width (upper - lower) or relative width (width / true size)
- Example: "Median width = 15%" means median(CI_upper - CI_lower) / true_size = 0.15
- **Narrower is better** (more precise information)

**Conservatism**: When coverage > target (e.g., 95% vs 90%).
- Conservative intervals are **wider** than necessary
- Pro: safer (less risk of underestimation)
- Con: less precise (wastes information)

**Efficiency**: The balance of coverage and precision.
- Formula: coverage / (1 + relative_width)
- Higher is better (high coverage, narrow width)

**Calibration**: Synonym for coverage (whether CI contains true value at target rate).

**Interval Arithmetic**: Propagating intervals by operating on bounds.
- Product: [a,b] × [c,d] = [ac, bd]
- Sum: [a,b] + [c,d] = [a+c, b+d]
- Typically conservative (wider than true Bayesian propagation)

**Oracle**: The optimal method (true Bayesian propagation via Monte Carlo).
- Used as baseline for comparison
- Computationally expensive (not practical for production)

**Warmup**: Initial sampling to prime the Beta posterior before using size estimates.
- Current: 10 samples (constructor)
- Studies use: 200 samples (for validation)
```

#### Issue #16: Early Termination Correctness Language

**Problem**: Mixes frequentist and Bayesian concepts.

**Fix**: Rewrite Study B with consistent Bayesian language (see Issue #1 fix above).

#### Issue #17: Convergence Not Formally Defined

**Problem**: "Converges to true value" is informal.

**Fix**: Add to Study A (see Issue #2 fix above):

```markdown
**A3: Point estimate convergence** (formal definition)

**Metric**: Mean Absolute Error (MAE)
```
MAE(n) = E[|estimate(n) - true| / true]
```

**Hypothesis**: MAE decreases as O(1/√n)

**Test**: Fit MAE ~ a/√n + b via least squares
- If R² ≥ 0.80, convergence rate is consistent with theory
- Report fitted parameters: a (convergence speed), b (asymptotic bias)

**Acceptance**: R² ≥ 0.80 and b < 0.05 (less than 5% asymptotic bias)
```

---

### UNEXPLORED IDEAS

#### Issue #18: Adaptive Warmup

**Fix**: Add Study H (see proposal.md Phase 2.1).

#### Issue #19: Warm Start Shrinking

**Fix**: Add Study I (see proposal.md Phase 2.2).

#### Issue #20: Non-Uniform Base Distributions

**Fix**: Add Study J (see proposal.md Phase 2.3).

#### Issue #21: Correlation in Composition

**Fix**: Add Study K (see proposal.md Phase 2.4).

---

### MISSING VALIDATION

#### Issue #22: All Issues Above

All issues documented above with detailed fixes.

---

## Implementation Plan

### Phase 1: Critical Fixes (Blocking)

1. Fix Study B mathematical interpretation ✓
2. Fix Study A sequential testing bias ✓
3. Fix Study C ground truth ✓
4. Fix Study D calibration vs precision ✓
5. Fix Study E shrinking model ✓
6. Verify Study F implementation
7. Add Beta prior justification
8. Add power analysis to all studies
9. Add glossary

**Estimated Effort**: 2-3 weeks
**Deliverable**: Revised `ci-calibration-advanced.md` with all critical fixes

### Phase 2: Enhanced Analysis (High Priority)

1. Investigate depth-2 vs depth-3 anomaly
2. Add outlier detection
3. Add baseline comparisons
4. Add warmup recommendation analysis
5. Add interval arithmetic proof

**Estimated Effort**: 1-2 weeks
**Deliverable**: Enhanced `ci-calibration.md` with anomaly investigation and baselines

### Phase 3: New Studies (Medium Priority)

1. Implement Study H (adaptive warmup)
2. Implement Study I (warm start shrinking)
3. Implement Studies J and K (optional)

**Estimated Effort**: 2-3 weeks per study
**Deliverable**: New evidence documents for Studies H, I, J, K

---

## Success Metrics

1. **Zero mathematical errors**: All formulas verified
2. **100% reproducible**: All studies deterministic
3. **Adequate power**: All studies achieve ≥75% power for meaningful effects
4. **Clear documentation**: All terms defined in glossary
5. **External audit ready**: Raw data, code, and documentation sufficient for replication

---

## Open Questions for Stakeholders

1. **Beta prior**: Keep (2,1) or switch to (1,1) or (0.5,0.5)?
2. **Warmup count**: Accept study recommendation or keep current (10)?
3. **Target precision**: What is acceptable width ratio vs oracle? (2×? 3×?)
4. **Depth-2 anomaly**: How much investigation effort is warranted?
5. **Warm-start shrinking**: If Study I shows benefit, should it become default?
