# Design: Update `.exists()` Evidence Methodology

## Context

PR #526 introduced `.exists()` support with an evidence study demonstrating detection rates. Issue #529 provided a detailed review identifying methodological improvements needed to make the evidence bulletproof.

Key stakeholders:
- Users evaluating FluentCheck vs other PBT frameworks
- Contributors maintaining the evidence suite
- Reviewers assessing statistical claims

## Goals / Non-Goals

### Goals
- Strengthen evidence methodology to be scientifically rigorous
- Demonstrate the value of first-class `.exists()` support objectively
- Provide clear, defensible claims about FluentCheck's advantages
- Test double-negation equivalence within FluentCheck (no cross-framework confounds)

### Non-Goals
- Change the `.exists()` API or implementation
- Benchmark against other frameworks directly (introduces confounding factors)
- Claim statistical efficiency advantages (detection rates match theory by design)

## Key Decisions

### Decision 1: Test Double-Negation Within FluentCheck

**What**: Compare `.exists(x, P)` vs `!forall(x, !P)` using FluentCheck's own `forall`.

**Why**: 
- Eliminates cross-framework confounding factors (different RNGs, overhead, etc.)
- Directly tests the claim that first-class support provides value
- Scientifically rigorous: same framework, same conditions, different approaches

**Alternatives considered**:
- Compare FluentCheck vs fast-check: Rejected due to confounding factors
- Only document the difference: Rejected; empirical evidence is stronger

### Decision 2: Frame Around "First-Class Expressiveness"

**What**: Reframe claims from "capability" to "first-class expressiveness and composition."

**Why**:
- Other frameworks CAN emulate exists via double-negation
- The real value is: no mental gymnastics, natural composition, direct shrinking
- Avoids pedantic counter-arguments about mathematical equivalence

**The double-negation technique**:
```javascript
// In fast-check (or FluentCheck's forall):
fc.assert(fc.property(arb, x => !predicate(x)))
// Counter-example of ¬P(x) is a witness for P(x)
```

### Decision 3: Measure Shrinking Quality

**What**: New study measuring witness minimization effectiveness.

**Why**:
- Shrinking is implemented but never evaluated in existing studies
- This is a genuine differentiator (manual loops can't shrink)
- Quantifiable: initial witness value vs final shrunk value

**Metrics**:
- Shrink ratio: `|initial - minimal| / |range|`
- Shrink iterations
- Time spent shrinking
- Correctness: does shrunk witness still satisfy predicate?

### Decision 4: Drop "Early Exit" as Differentiator

**What**: Remove claims that early termination is an advantage over manual loops.

**Why**: A simple `while(!found)` loop also exits early. This is NOT a differentiator.

**Real differentiators**:
1. **Shrinking**: Manual loops don't shrink witnesses
2. **Safety**: Configurable sample limits prevent infinite loops
3. **Composition**: `exists(a).forall(b)` is trivial; nested negations are nightmarish

### Decision 5: Statistical Equivalence Methodology

**What**: Modular arithmetic predicates (`x % k === 0`) are statistically equivalent to random-process witnesses.

**Why**:
- For uniform random sampling, only witness **count** matters, not **arrangement**
- Expected detection rate `P = 1 - (1-d)^n` applies to both
- Modular arithmetic is preferable: exact density, easy verification, no additional randomness

**Formal justification**:
- Let W = set of witnesses, |W| = count
- P(sample hits witness) = |W| / |range| = density
- This is independent of witness spatial distribution
- Both modular (evenly spaced) and random (clustered) witnesses yield same detection probability

## Study Designs

### Shrinking Study

```typescript
// Scenario: Minimal witness is 101
fc.scenario()
  .exists('x', fc.integer(1, 1000000))
  .then(({ x }) => x > 100)
  .check()

// Expected: Initial witness could be large (e.g., 847293)
// Shrunk witness should be 101 (the minimal value satisfying x > 100)
```

**Measurements**:
| Metric | Description |
|--------|-------------|
| `initial_witness` | First witness found before shrinking |
| `final_witness` | Witness after shrinking |
| `expected_minimal` | Theoretical minimal witness |
| `shrink_iterations` | Number of shrink attempts |
| `shrink_time_micros` | Time spent shrinking |
| `is_minimal` | `final_witness === expected_minimal` |

### Double-Negation Study

```typescript
// First-class exists
const existsResult = fc.scenario()
  .exists('x', fc.integer(1, 1000000))
  .then(({ x }) => x % 10000 === 0)
  .check()

// Double-negation emulation
const forallResult = fc.scenario()
  .forall('x', fc.integer(1, 1000000))
  .then(({ x }) => !(x % 10000 === 0))  // ¬P(x)
  .check()
// If forallResult.satisfiable === false, counterexample is witness for P
```

**Measurements**:
| Metric | Description |
|--------|-------------|
| `approach` | "first_class" or "double_negation" |
| `detection_rate` | Proportion finding witness |
| `tests_run` | Tests before termination |
| `witness_value` | The found witness |
| `witness_is_shrunk` | Whether shrinking occurred |
| `shrunk_witness` | Final witness after shrinking |

**Composition test**:
```typescript
// First-class: Natural
fc.scenario()
  .exists('a', fc.integer(1, 100))
  .forall('b', fc.integer(-10, 10))
  .then(({ a, b }) => a + b > 50)

// Double-negation: Nightmarish
// ∃a. ∀b. P(a,b) ≡ ¬∀a. ¬∀b. P(a,b) ≡ ¬∀a. ∃b. ¬P(a,b)
// This requires nested scenario construction - demonstrably complex
fc.scenario()
  .forall('a', fc.integer(1, 100))
  .then(({ a }) => {
    fc.scenario()
      .forall('b', fc.integer(-10, 10))
      .then(({ b }) => !(a + b > 50))  // ¬P(a,b)
      .check()
      .assertSatisfiable()  // ¬∀b. ¬P(a,b)
  })
  .check()
  .assertNotSatisfiable()
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Double-negation study shows no shrinking difference | Document that both approaches shrink equivalently; focus on composition complexity |
| Shrinking study shows poor minimization | This would be a bug to fix, not an evidence problem |
| Statistical tests show deviation from theory | Investigate RNG issues; deviations indicate bugs |

## Migration Plan

No migration needed - this is documentation/evidence only.

## Open Questions

1. Should we add a `--with-shrinking-metrics` flag to the evidence runner for detailed shrinking analysis?
2. Should the double-negation study be part of the main evidence suite or a separate "methodology validation" suite?
