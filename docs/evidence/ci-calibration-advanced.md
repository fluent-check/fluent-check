# Advanced CI Calibration Studies (Proposed)

## Context

The basic CI calibration study validates that 90% credible intervals contain the true size ~90% of the time under controlled conditions. However, real-world PBT scenarios are more complex. This document proposes additional studies to validate CI behavior in realistic conditions.

## Critical Usage Points

From code analysis, CIs are used for:

1. **Early Termination in FilteredArbitrary** (line 61):
   ```typescript
   while (baseSize * sizeEstimation.inv(upperCredibleInterval) >= 1)
   ```
   If upper CI bound suggests size < 1, stop trying to find passing values.

2. **Weighted Sampling in ArbitraryComposite**:
   Selects which sub-arbitrary to sample from, weighted by size.

3. **Search Space Calculation in Scenario**:
   Product of all quantifier sizes determines exploration strategy.

## Proposed Studies

### Study A: Convergence Dynamics

**Question**: How does the CI behave during sampling? Does it converge appropriately?

**Hypotheses**:
- A1: CI width decreases monotonically with sample count
- A2: CI contains true value at all checkpoints (not just final)
- A3: Point estimate converges to true value

**Method**:
1. Create filtered arbitrary with known pass rate
2. Sample incrementally (1, 5, 10, 25, 50, 100, 200, 500 samples)
3. At each checkpoint, record CI bounds and point estimate
4. Verify coverage at each checkpoint

**Why it matters**: If CI is correct after 200 samples but wrong after 10, we might make bad early decisions.

---

### Study B: Early Termination Correctness

**Question**: Does the early termination logic in FilteredArbitrary make correct decisions?

**Hypotheses**:
- B1: When terminating early, the true size is actually < 1 (empty filter) with ≥90% confidence
- B2: False positive rate (terminate when size > 1) is ≤ 10%
- B3: False negative rate (keep trying when size = 0) is minimized

**Method**:
1. Create filters with various pass rates including edge cases (0.1%, 1%, 10%)
2. Track when early termination triggers
3. Compare to ground truth (exhaustive enumeration for small spaces)

**Why it matters**: Wrong termination = missed values or infinite loops.

---

### Study C: Adversarial Filter Patterns

**Question**: Does CI calibration hold for non-uniform filter patterns?

**Hypotheses**:
- C1: Clustered acceptance (every Nth value passes) maintains calibration
- C2: Patterned rejection (modular arithmetic) maintains calibration
- C3: Value-dependent pass rates maintain calibration

**Scenarios**:
```typescript
// Clustered: pass rate 10%, but clustered
x => (x % 100) < 10

// Patterned: pass rate ~50%, but structured
x => isPrime(x)

// Dependent: pass rate depends on value magnitude
x => x > 500 || Math.random() < 0.1
```

**Why it matters**: Real predicates aren't uniform random.

---

### Study D: Composition Depth Impact

**Question**: How does CI coverage degrade with composition depth?

**Hypotheses**:
- D1: Coverage remains ≥90% for depth ≤ 3
- D2: Coverage remains ≥85% for depth ≤ 5
- D3: Coverage degrades predictably with depth

**Method**:
1. Create increasingly deep compositions:
   - Depth 1: `tuple(filtered, filtered)`
   - Depth 2: `tuple(tuple(filtered, filtered), filtered)`
   - Depth 3+: recursive nesting
2. Measure coverage at each depth

**Why it matters**: Complex types = deep composition.

---

### Study E: Shrinking with Filtered Arbitraries

**Question**: Does CI correctly estimate the *shrunk* space after shrinking a filtered value?

**Hypotheses**:
- E1: Shrunk filtered arbitrary maintains CI calibration
- E2: Shrinking doesn't cause CI to become over-confident
- E3: Multiple shrink iterations maintain calibration

**Method**:
1. Sample from filtered arbitrary
2. Shrink the value
3. Check CI of shrunk arbitrary against exhaustive count

**Why it matters**: Shrinking is iterative; bad CI compounds.

---

### Study F: flatMap (ChainedArbitrary) Dependencies

**Question**: How does CI behave with dependent arbitraries?

**Hypotheses**:
- F1: ChainedArbitrary CI is conservative (upper bound always valid)
- F2: Non-independence doesn't cause under-coverage
- F3: CI width increases appropriately with dependency

**Method**:
```typescript
// Dependent arbitrary: array size depends on previous int
fc.integer(1, 10).flatMap(n => fc.array(fc.integer(0, 99), n, n))
```

**Why it matters**: `flatMap` creates dependencies that violate independence assumptions.

---

### Study G: Weighted Union Selection

**Question**: Does size-weighted selection in ArbitraryComposite behave correctly when sizes are estimated?

**Hypotheses**:
- G1: Selection probability matches size ratio within 10%
- G2: Estimated sizes don't cause systematic bias
- G3: CI uncertainty is reflected in selection variance

**Method**:
1. Create union of exact + filtered arbitraries
2. Sample many times, track which sub-arbitrary was selected
3. Compare to expected ratio based on sizes

**Why it matters**: Wrong weighting = biased coverage.

---

## Priority Ranking

| Priority | Study | Impact | Complexity |
|----------|-------|--------|------------|
| 1 | B (Early Termination) | Critical - affects correctness | Medium |
| 2 | A (Convergence) | High - affects early decisions | Low |
| 3 | D (Composition Depth) | High - affects complex types | Medium |
| 4 | G (Weighted Union) | Medium - affects coverage | Low |
| 5 | C (Adversarial Patterns) | Medium - edge cases | Medium |
| 6 | E (Shrinking) | Medium - iterative impact | High |
| 7 | F (Dependencies) | Low - known limitation | High |

## Recommendation

Start with Studies A, B, and D as they directly validate the assumptions the codebase makes about CI behavior. Study B is particularly critical because early termination affects correctness, not just efficiency.
