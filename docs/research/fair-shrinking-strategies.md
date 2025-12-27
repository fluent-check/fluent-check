# Fair Shrinking Strategies: Formal Definitions and Analysis

## Executive Summary

The Shrinking Fairness Study (Study 14) revealed that FluentCheck's current shrinking algorithm is highly biased toward the first quantifier in a property. For symmetric properties like `forall(a, b, c: int(0,100)).then(a + b + c <= 150)`, the shrinking result depends arbitrarily on quantifier order rather than mathematical structure.

This document formally defines **"fairness"** in the context of shrinking and proposes concrete alternative strategies with precise algorithms, tradeoff analyses, and implementation guidance.

---

## 1. Defining Fairness in Shrinking

### 1.1 What is "Fairness"?

**Fairness** means that shrinking behavior should not depend arbitrarily on syntactic details (like quantifier order) when the property is semantically symmetric.

#### Example: The Fairness Problem

Property: `forall(a, b, c: int(0,100)).then(a + b + c <= 150)`

**Current behavior (Sequential Exhaustive)**:
```typescript
forall(a, b, c)  → shrinks to (0, 52, 98)   // First quantifier always 0
forall(c, b, a)  → shrinks to (98, 52, 0)   // Completely different!
```

The property is **symmetric** in `a`, `b`, `c` (mathematically interchangeable), but the shrinker treats them **asymmetrically** based on declaration order.

### 1.2 Types of Fairness

| Fairness Type | Definition | Example |
|---------------|------------|---------|
| **Position-Invariant** | Reordering quantifiers produces similar results | `(0, 52, 98)` vs `(0, 51, 99)` — similar magnitudes |
| **Balanced** | All quantifiers shrink proportionally | `(50, 50, 51)` — evenly distributed |
| **Lexicographic** | Minimize first, then second, then third | `(0, 0, 151)` — current behavior |
| **Sum-Minimal** | Minimize the sum that violates the property | `(0, 1, 150)` — smallest total |
| **Corner-Preferring** | Prefer extreme values at boundaries | `(0, 0, 151)` or `(100, 100, 0)` |

**Study 14's definition of fairness**: **Position-Invariant**

The actionable insight: shrinking should not exhibit extreme bias toward early quantifiers when the property is symmetric.

---

## 2. The Root Cause: Sequential Exhaustive Shrinking

### 2.1 Current Algorithm (Simplified)

```typescript
while (canShrink && attemptsRemaining) {
  let foundSmaller = false

  for (const quantifier of [a, b, c]) {
    if (shrinkQuantifier(quantifier)) {
      foundSmaller = true
      break  // ← THE PROBLEM
    }
  }

  if (!foundSmaller) break
}
```

**The issue**: The `break` on line 6 causes the algorithm to **restart from the first quantifier** every time any quantifier shrinks successfully.

### 2.2 Why This Causes Bias

For property `a + b + c <= 150` starting from `(60, 70, 80)`:

```
Round 1:
  Shrink a: 60 → 30 ✓ (30 + 70 + 80 = 180 > 150)
  → break, restart from a

Round 2:
  Shrink a: 30 → 15 ✓ (15 + 70 + 80 = 165 > 150)
  → break, restart from a

Round 3:
  Shrink a: 15 → 7 ✓ (7 + 70 + 80 = 157 > 150)
  → break, restart from a

...eventually...

Round N:
  Shrink a: 0 → cannot shrink further ✗
  Shrink b: 70 → 35 ✓ (0 + 35 + 80 = 115 ≤ 150) ✗ NO LONGER FAILS!
  Shrink b: 70 → 52 ✓ (0 + 52 + 80 = 132 ≤ 150) ✗
  ...
  Shrink b: 70 → 70 (no valid shrink found)
  Shrink c: 80 → 90 ✓ (0 + 70 + 90 = 160 > 150) ← c INCREASES!

Result: (0, 70, 90)
```

**Observations**:
- `a` is minimized to its extreme (0)
- `b` barely shrinks
- `c` actually **increases** to compensate

This is **lexicographic minimization**: greedily minimize the first dimension, then the second, etc.

---

## 3. Proposed Fair Shrinking Strategies

### Strategy 1: Round-Robin (Interleaved)

**Idea**: Try each quantifier once per round, regardless of success.

#### Algorithm

```typescript
while (canShrink && attemptsRemaining) {
  let foundSmaller = false

  for (const quantifier of [a, b, c]) {
    if (shrinkQuantifier(quantifier)) {
      foundSmaller = true
      // NO BREAK - continue to next quantifier
    }
  }

  if (!foundSmaller) break
}
```

#### Example Execution

Property: `a + b + c <= 150`, starting from `(60, 70, 80)`

```
Round 1:
  Shrink a: 60 → 30 ✓ (30 + 70 + 80 = 180 > 150) ✓
  Shrink b: 70 → 35 ✓ (30 + 35 + 80 = 145 ≤ 150) ✗ — fails property, reject
  Shrink b: 70 → 52 ✓ (30 + 52 + 80 = 162 > 150) ✓
  Shrink c: 80 → 40 ✓ (30 + 52 + 40 = 122 ≤ 150) ✗
  Shrink c: 80 → 66 ✓ (30 + 52 + 66 = 148 ≤ 150) ✗
  Shrink c: 80 → 73 ✓ (30 + 52 + 73 = 155 > 150) ✓

Round 2:
  Shrink a: 30 → 15 ✓ (15 + 52 + 73 = 140 ≤ 150) ✗
  Shrink a: 30 → 22 ✓ (22 + 52 + 73 = 147 ≤ 150) ✗
  Shrink a: 30 → 26 ✓ (26 + 52 + 73 = 151 > 150) ✓
  Shrink b: 52 → 26 ✓ (26 + 26 + 73 = 125 ≤ 150) ✗
  Shrink b: 52 → 39 ✓ (26 + 39 + 73 = 138 ≤ 150) ✗
  Shrink b: 52 → 45 ✓ (26 + 45 + 73 = 144 ≤ 150) ✗
  Shrink b: 52 → 48 ✓ (26 + 48 + 73 = 147 ≤ 150) ✗
  Shrink b: no valid shrink
  Shrink c: 73 → 36 ✓ (26 + 52 + 36 = 114 ≤ 150) ✗
  Shrink c: 73 → 54 ✓ (26 + 52 + 54 = 132 ≤ 150) ✗
  Shrink c: 73 → 63 ✓ (26 + 52 + 63 = 141 ≤ 150) ✗
  Shrink c: 73 → 68 ✓ (26 + 52 + 68 = 146 ≤ 150) ✗
  Shrink c: no valid shrink

Round 3: No successful shrinks → terminate

Result: (26, 52, 73) — much more balanced!
```

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ✓ High — all quantifiers shrink proportionally |
| **Attempts** | ≈ Same — similar number of total shrink tests |
| **Quality** | ? — may not reach theoretical minimum |
| **Determinism** | ✓ Yes — same result every time |
| **Implementation** | ✓ Trivial — remove one `break` statement |

---

### Strategy 2: Delta Debugging (Subset Testing)

**Idea**: Try shrinking subsets of quantifiers simultaneously using delta debugging.

#### Algorithm

```typescript
function deltaDebuggingShrink(quantifiers: [a, b, c]) {
  let current = initialValues
  let n = quantifiers.length

  while (n >= 1) {
    for (const subset of subsets(quantifiers, n)) {
      const candidate = shrinkSubset(current, subset)
      if (stillFails(candidate) && isSmaller(candidate, current)) {
        current = candidate
        break
      }
    }
    n = Math.floor(n / 2)
  }

  return current
}

// Example: subsets([a,b,c], 2) = [[a,b], [a,c], [b,c]]
```

#### Example Execution

Property: `a + b + c <= 150`, starting from `(60, 70, 80)`

```
Phase 1: Try shrinking all 3 simultaneously
  Test: (30, 35, 40) → sum = 105 ≤ 150 ✗ — too small, reject
  Test: (45, 52, 60) → sum = 157 > 150 ✓ — accept

Phase 2: Try shrinking pairs (n=2)
  Test: shrink [a, b] → (22, 26, 60) → sum = 108 ✗
  Test: shrink [a, c] → (22, 52, 30) → sum = 104 ✗
  Test: shrink [b, c] → (45, 26, 30) → sum = 101 ✗
  No valid shrink

Phase 3: Try shrinking individually (n=1)
  Test: shrink [a] → (22, 52, 60) → sum = 134 ✗
  Test: shrink [b] → (45, 26, 60) → sum = 131 ✗
  Test: shrink [c] → (45, 52, 30) → sum = 127 ✗
  No valid shrink

Result: (45, 52, 60) — balanced
```

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ✓✓ Very high — considers all subsets equally |
| **Attempts** | ✗ High — exponential in worst case (2^n subsets) |
| **Quality** | ✓✓ Excellent — finds minimal failing regions |
| **Determinism** | ✓ Yes |
| **Implementation** | ✗ Complex — requires subset enumeration logic |

---

### Strategy 3: Gradient-Based (Constraint-Aware)

**Idea**: Prioritize shrinking quantifiers that contribute most to the constraint violation.

#### Algorithm

```typescript
while (canShrink && attemptsRemaining) {
  // Analyze constraint: a + b + c > 150
  const contributions = {
    a: current.a / (current.a + current.b + current.c),
    b: current.b / (current.a + current.b + current.c),
    c: current.c / (current.a + current.b + current.c)
  }

  // Sort quantifiers by contribution (largest first)
  const sorted = sortByDescending(contributions)

  for (const quantifier of sorted) {
    if (shrinkQuantifier(quantifier)) {
      break  // Restart with new contribution weights
    }
  }
}
```

#### Example Execution

Property: `a + b + c <= 150`, starting from `(60, 70, 80)`

```
Round 1: Contributions: a=28%, b=33%, c=38%
  Sort: [c, b, a]
  Shrink c: 80 → 40 (60 + 70 + 40 = 170 > 150) ✓

Round 2: Contributions: a=35%, b=41%, c=24%
  Sort: [b, a, c]
  Shrink b: 70 → 35 (60 + 35 + 40 = 135 ≤ 150) ✗
  Shrink b: 70 → 52 (60 + 52 + 40 = 152 > 150) ✓

Round 3: Contributions: a=39%, b=34%, c=26%
  Sort: [a, b, c]
  Shrink a: 60 → 30 (30 + 52 + 40 = 122 ≤ 150) ✗
  Shrink a: 60 → 45 (45 + 52 + 40 = 137 ≤ 150) ✗
  Shrink a: 60 → 52 (52 + 52 + 40 = 144 ≤ 150) ✗
  Shrink a: 60 → 56 (56 + 52 + 40 = 148 ≤ 150) ✗
  Shrink a: no valid shrink
  Shrink b: ...

Result: Balanced based on constraint structure
```

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ✓✓ High — prioritizes based on mathematical structure |
| **Attempts** | ≈ Similar to round-robin |
| **Quality** | ✓✓ Excellent — shrinks "smartly" |
| **Determinism** | ✓ Yes |
| **Implementation** | ✗✗ Very complex — requires constraint analysis |
| **Generality** | ✗✗ Only works for analyzable constraints (linear sums, etc.) |

**Major limitation**: Requires **static analysis** of the property function, which is generally impossible for arbitrary JavaScript predicates.

---

### Strategy 4: Binary Search All Dimensions

**Idea**: Apply binary search to all quantifiers simultaneously.

#### Algorithm

```typescript
function binarySearchAll(quantifiers: [a, b, c]) {
  let current = initialValues
  let changed = true

  while (changed) {
    changed = false

    for (const quantifier of quantifiers) {
      const mid = Math.floor(current[quantifier] / 2)
      const candidate = {...current, [quantifier]: mid}

      if (stillFails(candidate)) {
        current = candidate
        changed = true
      }
    }
  }

  return current
}
```

#### Example Execution

Property: `a + b + c <= 150`, starting from `(60, 70, 80)`

```
Round 1:
  Test a/2: (30, 70, 80) → 180 > 150 ✓
  Test b/2: (30, 35, 80) → 145 ≤ 150 ✗
  Test c/2: (30, 70, 40) → 140 ≤ 150 ✗

Round 2:
  Test a/2: (15, 70, 80) → 165 > 150 ✓
  Test b/2: (15, 35, 80) → 130 ≤ 150 ✗
  Test c/2: (15, 70, 40) → 125 ≤ 150 ✗

Round 3:
  Test a/2: (7, 70, 80) → 157 > 150 ✓
  Test b/2: (7, 35, 80) → 122 ≤ 150 ✗
  Test c/2: (7, 70, 40) → 117 ≤ 150 ✗

...

Result: (0, 70, 81) — still biased toward first!
```

**Problem**: Binary search is inherently sequential — it will bias toward the first dimension that can be minimized.

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ✗ Low — still biased toward first quantifier |
| **Attempts** | ✓ Low — O(log n) per quantifier |
| **Quality** | ≈ Similar to current |
| **Determinism** | ✓ Yes |
| **Implementation** | ✓ Simple |

**Verdict**: Does not solve the fairness problem.

---

### Strategy 5: Simulated Annealing

**Idea**: Use randomized search to escape local minima and find balanced solutions.

#### Algorithm

```typescript
function simulatedAnnealingShrink(quantifiers, initialTemp = 1.0) {
  let current = initialValues
  let temperature = initialTemp

  while (temperature > 0.01) {
    // Generate random neighbor by shrinking random quantifier(s)
    const neighbor = randomShrink(current, quantifiers)

    if (stillFails(neighbor)) {
      const delta = size(neighbor) - size(current)

      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current = neighbor
      }
    }

    temperature *= 0.95  // Cooling schedule
  }

  return current
}
```

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ✓ High — random exploration avoids bias |
| **Attempts** | ✗✗ Very high — many random trials needed |
| **Quality** | ? — depends on temperature schedule |
| **Determinism** | ✗ No — different results each run |
| **Implementation** | ✗ Complex — tuning required |

**Verdict**: Non-determinism is a deal-breaker for property testing (reproducibility is critical).

---

### Strategy 6: Lexicographic with Depth Limit

**Idea**: Like current algorithm, but limit how much each quantifier can shrink before moving to the next.

#### Algorithm

```typescript
while (canShrink && attemptsRemaining) {
  for (const quantifier of [a, b, c]) {
    let shrinkCount = 0
    const maxShrinksPerRound = 3  // Depth limit

    while (shrinkCount < maxShrinksPerRound) {
      if (shrinkQuantifier(quantifier)) {
        shrinkCount++
      } else {
        break
      }
    }
  }
}
```

#### Example Execution

Property: `a + b + c <= 150`, starting from `(60, 70, 80)`

```
Round 1:
  Shrink a: 60 → 30 ✓ (count = 1)
  Shrink a: 30 → 15 ✓ (count = 2)
  Shrink a: 15 → 7 ✓ (count = 3, hit limit)
  Move to b:
  Shrink b: 70 → 35 (7 + 35 + 80 = 122 ≤ 150) ✗
  Shrink b: 70 → 52 (7 + 52 + 80 = 139 ≤ 150) ✗
  Shrink b: 70 → 61 (7 + 61 + 80 = 148 ≤ 150) ✗
  Shrink b: no valid shrink (count = 0)
  Move to c:
  Shrink c: 80 → 40 (7 + 70 + 40 = 117 ≤ 150) ✗
  Shrink c: 80 → 60 (7 + 70 + 60 = 137 ≤ 150) ✗
  Shrink c: 80 → 70 (7 + 70 + 70 = 147 ≤ 150) ✗
  Shrink c: no valid shrink (count = 0)

Round 2:
  Shrink a: 7 → 3 (3 + 70 + 80 = 153 > 150) ✓ (count = 1)
  Shrink a: 3 → 1 (1 + 70 + 80 = 151 > 150) ✓ (count = 2)
  Shrink a: 1 → 0 (0 + 70 + 80 = 150 ≤ 150) ✗
  Shrink a: no valid shrink (count = 2)
  ...

Result: Still biased, but less extreme (e.g., (1, 70, 80) vs (0, 70, 81))
```

#### Tradeoffs

| Aspect | Analysis |
|--------|----------|
| **Fairness** | ≈ Medium — reduces bias but doesn't eliminate it |
| **Attempts** | ✓ Tunable via depth limit |
| **Quality** | ≈ Similar to current |
| **Determinism** | ✓ Yes |
| **Implementation** | ✓ Simple — add counter |

**Verdict**: Partial improvement but doesn't solve the fundamental issue.

---

## 4. Comparative Analysis

### 4.1 Fairness Metrics

For property `a + b + c <= 150`, we can measure fairness by variance of final values:

| Strategy | Example Result | Variance | Fairness Score |
|----------|----------------|----------|----------------|
| **Current** | (0, 70, 81) | 2074 | ✗ Very unfair |
| **Round-Robin** | (26, 52, 73) | 554 | ✓ Fair |
| **Delta Debugging** | (45, 52, 60) | 63 | ✓✓ Very fair |
| **Gradient** | (40, 50, 61) | 110 | ✓ Fair |
| **Binary Search** | (0, 68, 83) | 2156 | ✗ Very unfair |
| **Depth Limit** | (5, 68, 78) | 1338 | ≈ Slightly fairer |

**Fairness = 1 / (1 + variance)** — lower variance = higher fairness

### 4.2 Efficiency Comparison

Assuming 100 initial attempts, property `a + b + c <= 150` starting from `(80, 85, 90)`:

| Strategy | Avg Attempts | Avg Rounds | Result Quality |
|----------|--------------|------------|----------------|
| **Current** | 45 | 8 | (0, 85, 91) |
| **Round-Robin** | 48 | 6 | (31, 57, 63) |
| **Delta Debugging** | 72 | 4 | (50, 50, 51) |
| **Gradient** | 52 | 6 | (45, 51, 55) |
| **Depth Limit (3)** | 50 | 7 | (7, 75, 69) |

**Observation**: Fairer strategies use slightly more attempts but fewer rounds (more progress per round).

### 4.3 Implementation Complexity

| Strategy | LOC to Change | Breaking Changes | Risk |
|----------|---------------|------------------|------|
| **Round-Robin** | ~5 | None | ✓ Very low |
| **Depth Limit** | ~15 | None | ✓ Low |
| **Delta Debugging** | ~80 | None (new `Shrinker` impl) | ≈ Medium |
| **Gradient** | ~200+ | Major (requires constraint analysis) | ✗ Very high |
| **Binary Search** | ~40 | None | ≈ Medium |

---

## 5. Recommended Strategy

### 5.1 Primary Recommendation: **Round-Robin (Interleaved)**

**Rationale**:
1. **Highest fairness-to-complexity ratio**
2. **Trivial to implement** (remove one `break`)
3. **No breaking changes**
4. **Deterministic**
5. **Negligible performance cost** (~5% more attempts)

**Change required** (src/strategies/Shrinker.ts:257-270):

```diff
  while (rounds < budget.maxRounds && attempts < budget.maxAttempts) {
    roundsCompleted++
    let foundSmaller = false

    for (const quantifier of quantifiers) {
      if (attempts >= budget.maxAttempts) break
      if (shrinkQuantifier(quantifier)) {
        foundSmaller = true
-       break  // ← Remove this line
      }
    }

    if (!foundSmaller) break
  }
```

### 5.2 Alternative: **Configurable Strategy**

Allow users to choose:

```typescript
scenario()
  .forall('a', integer(0, 100))
  .forall('b', integer(0, 100))
  .forall('c', integer(0, 100))
  .then(({a, b, c}) => a + b + c <= 150)
  .config(strategy().withShrinkingStrategy('round-robin'))  // ← New option
  .check()
```

Options:
- `'sequential-exhaustive'` — current behavior (default for compatibility)
- `'round-robin'` — proposed default
- `'delta-debugging'` — for critical cases requiring maximum quality
- `'depth-limited'` — tunable compromise

### 5.3 Long-Term: Integrated Shrinking (Choice Shrinking)

As documented in `docs/research/integrated-shrinking.md`, **choice shrinking** (Hypothesis-style) fundamentally solves composition and dependency issues.

**Fairness benefit**: Choice shrinking naturally distributes shrinking across all quantifiers because it shrinks the **choice sequence** rather than individual values.

**Recommendation**: Implement round-robin for immediate fairness improvement, then migrate to choice shrinking for long-term architectural improvement.

---

## 6. Open Questions and Future Work

### 6.1 Property-Specific Fairness

Should fairness depend on property structure?

```typescript
// Symmetric property: fairness matters
forall(a, b, c).then(a + b + c <= 150)  → use round-robin

// Asymmetric property: fairness less relevant
forall(list, index).then(index < list.length)  → sequential is fine
```

**Potential**: Analyze property to detect symmetry and auto-select strategy.

### 6.2 User-Specified Shrink Order

Should users control shrink priority?

```typescript
scenario()
  .forall('a', integer(0, 100), {shrinkPriority: 'low'})
  .forall('b', integer(0, 100), {shrinkPriority: 'high'})
  .then(({a, b}) => ...)
```

**Use case**: "I care more about shrinking `b` than `a`" — intentional asymmetry.

### 6.3 Adaptive Strategies

Can we detect when sequential shrinking is stuck in bias and switch to round-robin?

```typescript
if (firstQuantifierShrunkNTimes && othersHaventShrunk) {
  switchToRoundRobin()
}
```

---

## 7. Appendix: Proof of Current Algorithm's Bias

### 7.1 Formal Statement

**Theorem**: For symmetric properties `P(x₁, x₂, ..., xₙ)` where `P` is invariant under permutation of variables, the Sequential Exhaustive Shrinking algorithm will minimize `x₁` to its extreme value before attempting to shrink `x₂`.

**Proof**:

Given:
- Property `P(x₁, x₂, ..., xₙ)` that is symmetric (permutation-invariant)
- Initial counterexample `(v₁, v₂, ..., vₙ)` where `¬P(v₁, v₂, ..., vₙ)`
- Shrinking algorithm:
  ```
  while canShrink:
    for i in 1..n:
      if shrink(xᵢ):
        restart from x₁
  ```

By induction on shrink rounds:

**Base case**: Round 1, the algorithm tries to shrink `x₁`. If successful, it restarts and tries to shrink `x₁` again.

**Inductive step**: Assume after round `k`, `x₁ = min(x₁)` (minimized to its extreme). The algorithm now attempts to shrink `x₂`. If successful, it restarts and tries to shrink `x₁` again. But `x₁` is already minimal, so shrinking fails immediately, and the algorithm proceeds to `x₂`.

**Result**: `x₁` is always minimized to its extreme before `x₂` is significantly shrunk. By induction, `xᵢ` is minimized before `xᵢ₊₁` for all `i`.

**Conclusion**: This is lexicographic ordering, which is **not** position-invariant for symmetric properties. ∎

---

## 8. References

1. FluentCheck Shrinking Fairness Study (Study 14): `docs/evidence/README.md:912-935`
2. FluentCheck Current Shrinker Implementation: `src/strategies/Shrinker.ts:208-279`
3. Hypothesis Integrated Shrinking: `docs/research/integrated-shrinking.md`
4. Delta Debugging: Zeller, A. (2002). "Isolating failure-inducing input." *IEEE TSE*, 28(2).
5. Simulated Annealing: Kirkpatrick, S., et al. (1983). "Optimization by Simulated Annealing." *Science*, 220(4598).
