# Design Proposal: Mapped Arbitrary Size Estimation

> **Related Issue:** [#8](https://github.com/fluent-check/fluent-check/issues/8) - Provide accurate codomain size estimation in non-bijective mapped Arbitraries
>
> **Related PR:** [#444](https://github.com/fluent-check/fluent-check/pull/444) - Implement `ExactSizeArbitrary` and `EstimatedSizeArbitrary` types
>
> **Related Issue:** [#464](https://github.com/fluent-check/fluent-check/issues/464) - Add `hashCode`/`equals` value identity functions to Arbitrary (addresses `stableStringify` performance concerns)

## TL;DR

**What we implement in v1:**

| Domain Size | Strategy | Returns |
|-------------|----------|---------|
| Small finite (≤ 5,000) | Exact enumeration | `ExactSize` with correct value |
| Integer range + pattern-matched `f` | Exact formula (e.g., `x % k` → min(k, n)) | `ExactSize` with formula-derived value |
| Everything else | Fraction-based sampling with fixed budget | `EstimatedSize` with heuristic CI |

**Key properties:**
- `size()` is **deterministic** (fixed internal seed), **pure**, **lazy** (computed on first call, not instantiation), and **cached**
- Fraction estimator is a **soft hint**, not a statistically rigorous cardinality estimator
- Type system has **known unsoundness**: `ExactSizeArbitrary.map()` may return `EstimatedSize` at runtime

**What we defer:**
- HyperLogLog, birthday paradox, Good-Turing estimators
- Unbounded domain support

> ⚠️ **Important:** Size is a heuristic hint for internal decisions (e.g., "is this set small enough to enumerate?"). Do not rely on it for logic validation or correctness guarantees.

---

## Problem Statement

Given a mapped arbitrary `baseArbitrary.map(f)`, estimate the codomain size when `f` is not bijective.

**Current implementation:**
```typescript
size() { return this.baseArbitrary.size() }
```

This is incorrect for non-bijective functions:
```typescript
fc.integer(0, 100).map(x => Math.floor(x / 2))  // Domain: 101, Codomain: 51
fc.integer(-100, 100).map(x => Math.abs(x))     // Domain: 201, Codomain: 101
fc.integer(0, 100).map(x => x % 10)             // Domain: 101, Codomain: 10
```

---

## Interaction with PR #444 Type System

PR #444 introduces `ExactSizeArbitrary<A>` and `EstimatedSizeArbitrary<A>` intersection types with the following assumptions:

```typescript
// ExactSizeArbitrary.map() returns ExactSizeArbitrary
integer(0, 100).map(x => x * 2)  // Type: ExactSizeArbitrary<number>

// EstimatedSizeArbitrary.map() returns EstimatedSizeArbitrary  
integer(0, 100).filter(x => x > 50).map(x => x * 2)  // Type: EstimatedSizeArbitrary<number>
```

**Key assumption in PR #444:** `map()` preserves size type because "mapping doesn't change cardinality."

### The Tension

This assumption is only true for **bijective** mappings. For non-bijective maps:

| Expression | Type (PR #444) | Actual Runtime Size |
|------------|----------------|---------------------|
| `integer(0, 100)` | `ExactSizeArbitrary` | `ExactSize { value: 101 }` |
| `integer(0, 100).map(x => x % 10)` | `ExactSizeArbitrary` | Should be 10, not 101 |

The type system claims the size is exact, but **the value is wrong** unless we estimate.

### Resolution Options

There are three honest ways to resolve this tension:

**Option A: Weaken `map()` Return Type in PR #444 (Recommended)**

Change `map()` to return a weaker type that doesn't promise exactness:

```typescript
// Current (unsound)
interface ExactSizeArbitrary<A> {
  size(): ExactSize
  map<B>(f: (a: A) => B): ExactSizeArbitrary<B>  // Lies about result
}

// Proposed (sound)
interface ExactSizeArbitrary<A> {
  size(): ExactSize
  map<B>(f: (a: A) => B): Arbitrary<B> & { size(): ArbitrarySize }  // Honest
}
```

This matches what we actually implement: mapping can produce an arbitrary with a known size, but not necessarily exact.

**Option B: Introduce `FiniteSize` Type**

Add a weaker size type that expresses "bounded but not necessarily exact":

```typescript
type FiniteSize = { type: 'finite'; upperBound: number }  // May be exact, not guaranteed
type ExactSize  = { type: 'exact'; value: number }        // Genuinely exact
type EstimatedSize = { type: 'estimated'; value: number; credibleInterval: [number, number] }
type ArbitrarySize = ExactSize | FiniteSize | EstimatedSize
```

Then `map()` on an exact arbitrary degrades to `FiniteSize` when exactness can't be proven. This keeps the type system honest while preserving useful information.

**Option C: Accept Known Unsoundness (Current Proposal)**

Keep the current type declarations but explicitly document the lie:

```typescript
// ExactSizeArbitrary.map() claims to return ExactSizeArbitrary,
// but may return EstimatedSize at runtime for non-bijective mappings.
// This is KNOWN UNSOUNDNESS that we accept for pragmatic reasons.
```

This is the path of least resistance but leaves callers who rely on `size().type === 'exact'` potentially broken.

### Proposed Strategy

We adopt **Option C** for v1, with explicit documentation of the unsoundness:

1. **Small exact domains** (≤ `ENUMERATION_THRESHOLD`): Enumerate and return `ExactSize` with correct value
2. **Known function patterns** (e.g., `x % k`): Return `ExactSize` with formula-derived value  
3. **Large domains requiring sampling**: Return `EstimatedSize`

**Known Unsoundness:** `ExactSizeArbitrary.map()` can return either `ExactSize` or `EstimatedSize` at runtime, violating its declared type. We accept this because:
- Users who need accurate sizes should check `size().type` regardless
- This is consistent with how `array()` already behaves (see PR #444 comments)
- Fixing the types properly (Option A or B) requires broader changes to PR #444

**Future Work:** Consider migrating to Option A or B in a future PR to make the type system fully sound.

---

## Mathematical Framework

### Definitions

Let:
- $D$ = domain of base arbitrary with $|D| = n$
- $f: D \to C$ = mapping function  
- $C$ = codomain (image of $f$)
- $|C| = m$ = cardinality we want to estimate

**Key constraint:** $m \leq n$ (trivial cardinality bound—the image of a function cannot exceed its domain).

### The Count-Distinct Problem

This is the **cardinality estimation** or **count-distinct** problem from database/streaming literature: given a stream of $n$ elements from domain $D$, estimate the number of distinct elements.

### Key Assumptions

The estimation model relies on several assumptions:

| # | Assumption | Description | Status |
|---|------------|-------------|--------|
| A1 | **IID Sampling** | Each sample from the base arbitrary is independent and identically distributed | Depends on arbitrary impl |
| A2 | **Uniform Sampling** | Samples are drawn uniformly from the domain $D$ | ✅ By design for exact arbitraries |
| A3 | **Stable Equality** | The stringifier produces consistent, collision-free keys for distinct values | Impl dependent |
| A4 | **Fraction Estimator Validity** | The estimator $\hat{m} = \frac{d}{k} \cdot n$ has bounded bias | 🔬 Requires validation |
| A5 | **Sample Size Sufficiency** | Sample size $k$ is large enough for reliable estimation | 🔬 Requires validation |

> **Validation:** Assumptions A4 and A5 require empirical validation through Monte Carlo simulations. See [Appendix: Validation of Assumptions through Simulation](#appendix-validation-of-assumptions-through-simulation).

### Statistical Model for Fraction-Based Estimation

When sampling $k$ values uniformly with replacement from domain $D$ of size $n$, and observing $d$ distinct values in the codomain $C$ of size $m$:

**Sampling process:** Each sample maps to one of $m$ codomain values. Under uniform sampling from $D$, the probability of hitting codomain value $c$ is $\frac{|f^{-1}(c)|}{n}$ where $f^{-1}(c)$ is the pre-image.

**Uniform codomain assumption:** If each codomain value has roughly equal pre-image size (i.e., $f$ is "balanced"), then hitting any codomain value has probability $\approx \frac{1}{m}$.

**Expected distinct values:** Under the uniform codomain assumption:
$$\mathbb{E}[d] = m \left(1 - \left(1 - \frac{1}{m}\right)^k\right)$$

For $k \ll m$ (few collisions), this simplifies to:
$$\mathbb{E}[d] \approx k \left(1 - \frac{k-1}{2m}\right) \approx k$$

For $k \gg m$ (many collisions):
$$\mathbb{E}[d] \approx m$$

**The fraction estimator:** Rather than inverting the complex formula above, we use the simple fraction estimator:
$$\hat{m} = \frac{d}{k} \cdot n$$

**Intuition:** If we observe $d/k$ fraction of distinct values in our sample, and sampling is uniform, then the codomain is approximately $d/k$ fraction of the domain.

**Bias analysis:** The fraction estimator has:
- **Positive bias** when $m$ is small relative to $k$ (we observe $d \approx m$, giving $\hat{m} \approx \frac{m}{k} \cdot n \gg m$)
- **Negative bias** when $m \approx n$ (near-bijective case, $d < k$ due to domain sampling, not collisions)

The estimator works best when:
1. $m$ is moderate relative to $k$ (neither too small nor too large)
2. The function $f$ is "balanced" (uniform pre-image sizes)

> **Design intent:** This estimator is deliberately "soft" — it's meant as a **rough hint for sizing decisions**, not a statistically rigorous cardinality estimator. For more precise estimation, textbook methods (Flajolet-Martin, HyperLogLog, etc.) use sketch-based approaches, but they're more complex than appropriate for a default `size()` method. If rigorous cardinality estimation is needed, users should enumerate or use specialized tooling.

### Confidence Interval Derivation

> **Important:** The CIs below are **heuristic approximations**, not exact confidence intervals for the distinct-count problem. The true distribution of $d$ (distinct values in $k$ samples from a codomain of size $m$) is a complex occupancy problem, not a simple binomial. We use binomial-style CIs because they're simple, well-understood, and empirically adequate for the purpose of a `size()` hint.

**Approach 1: Wilson score interval (recommended)**

Treat $d/k$ as a proportion and use the Wilson score interval (better than normal approximation for extreme values):

$$\tilde{p} = \frac{d + z^2/2}{k + z^2}, \quad \text{margin} = \frac{z}{k + z^2}\sqrt{\frac{d(k-d)}{k} + \frac{z^2}{4}}$$

$$\text{CI}_{95\%} = n \cdot [\tilde{p} - \text{margin}, \tilde{p} + \text{margin}]$$

where $z = 1.96$ for 95% confidence.

**Approach 2: Simple bounds (fallback) — CRITICAL**

> ⚠️ **These bounds are more important than the CI math itself.**

For robustness, **always** apply hard bounds regardless of what the Wilson interval calculates:
- Lower bound: $\max(d, \text{CI}_{\text{lower}})$ — we observed at least $d$ distinct values
- Upper bound: $\min(n, \text{CI}_{\text{upper}})$ — cannot exceed domain size

**Implementation requirement:**
```typescript
return {
  type: 'estimated',
  value: Math.max(d, Math.min(calculatedEstimate, n)),  // Clamp to [d, n]
  credibleInterval: [
    Math.max(d, calculatedCILower),   // Never below observed
    Math.min(n, calculatedCIUpper)    // Never above domain
  ]
}
```

**Rationale:** The Wilson score interval assumes a binomial distribution with independent trials. Sampling with replacement from a fixed domain creates dependency (if I pick distinct element $x_1$, the probability of picking a new distinct element drops). The hard bounds provide correctness guarantees regardless of CI math validity.

**Why not exact intervals?**

The exact distribution of $d$ given $m$ and $k$ involves Stirling numbers and is expensive to compute. For a `size()` method that's meant to be cheap, heuristic CIs are the right trade-off. The simulations in the appendix validate that these heuristics are "good enough" for our purposes.

---

## Design Decisions

### Decision 1: `size()` Must Be Deterministic, Pure, and Cheap

In a property-based testing library, `size()` is expected to be:
- **Pure** — no side effects
- **Cheap** — fast to compute
- **Deterministic** — same result on repeated calls

**Implications:**
- Use a fixed internal seed for any sampling, independent of user test RNG
- Cache the estimate per `MappedArbitrary` instance (for the lifetime of the instance)
- Document that `size()` for mapped arbitraries may call `f` many times

### Decision 2: Work Within PR #444's Type System

PR #444 defines the existing types:

```typescript
type ExactSize = { type: 'exact'; value: number }
type EstimatedSize = { type: 'estimated'; value: number; credibleInterval: [number, number] }
type ArbitrarySize = ExactSize | EstimatedSize
```

For mapped arbitraries, we return:
- `ExactSize` when we can enumerate or use exact formulas
- `EstimatedSize` when we must sample

**Unbounded domains:** For base arbitraries with unbounded domains, we currently do not provide a numeric size. This is left as future work. The `size()` method may throw or return a sentinel value indicating the domain is unbounded.

**Method tracking (optional):** Add a `method` field for debugging/introspection:

```typescript
interface ExtendedSize extends ArbitrarySize {
  method?: 'enumeration' | 'sampling-fraction' | 'pattern-match' | 'hyperloglog'
}
```

This is non-breaking—existing code that checks `size().type` continues to work.

**Estimation Type Discrimination (recommended):** To help internal logic distinguish between different estimation contexts, add an `estimationType` field:

```typescript
type EstimatedSize = {
  type: 'estimated'
  value: number
  credibleInterval: [number, number]
  // Helps distinguish estimation sources for future optimizations
  estimationType?: 'distinct-count-hint' | 'population-inference'
}
```

- `'distinct-count-hint'`: Used for mapped arbitraries (this document). Generally more stable.
- `'population-inference'`: Used for filtered arbitraries (PR #463). Based on rejection sampling.

This distinction allows the library to treat different estimation sources appropriately in future versions (e.g., different weight in combined uncertainties).

### Decision 3: Upper Bound Capping

Always cap estimates by the base domain size when known:

```typescript
// For exact base sizes, use exact upper bound; for estimated, use CI upper bound
const upperBound = baseSize.type === 'exact' 
  ? baseSize.value 
  : baseSize.credibleInterval[1]

return {
  type: 'estimated',
  value: Math.min(estimate.value, upperBound),
  credibleInterval: [
    estimate.lower,
    Math.min(estimate.upper, upperBound)
  ],
  method: 'sampling-fraction'
}
```

---

## Implementation Plan

### Phase 1 (v1): Core Implementation

#### 1.1 Exact Enumeration for Small Domains

When `baseSize.type === 'exact'` and `baseSize.value ≤ ENUMERATION_THRESHOLD`, enumerate and count exactly.

```typescript
private countExactCodomain(): number {
  // With #464: use hashCode/equals for deduplication
  const hashFn = this.getHashCode()
  const equalsFn = this.getEquals()
  const seen = new HashSet<B>(hashFn, equalsFn)
  
  for (const domainValue of this.baseArbitrary.enumerate()) {
    const codomainValue = this.f(domainValue)
    seen.add(codomainValue)
  }
  return seen.size
}

// Fallback (without #464):
private countExactCodomainFallback(): number {
  const seen = new Set<string>()
  for (const domainValue of this.baseArbitrary.enumerate()) {
    const codomainValue = this.f(domainValue)
    seen.add(this.stableStringify(codomainValue))
  }
  return seen.size
}
```

**Requirements:**
- Domain must be finite, exact, and small
- Deduplication must align with **codomain** equality semantics, not domain equality
- Arbitrary must support total enumeration (each value enumerated exactly once)
- With [#464](https://github.com/fluent-check/fluent-check/issues/464): use `hashCode()`/`equals()` for efficient, correct deduplication
- Without #464 (fallback): use a **stable stringifier** (not `JSON.stringify`) that:
  - Handles non-JSON values (functions, symbols, cyclic objects, BigInt)
  - Produces consistent key ordering (`{a:1, b:2}` === `{b:2, a:1}`)
  - Distinguishes `-0` vs `0`, handles `NaN`
  - Ideally aligns with the arbitrary's equality semantics

**Complexity:** $O(n)$ time (plus cost of `f` calls), $O(|C|)$ space

**Configuration:**
- `ENUMERATION_THRESHOLD` default: 5,000–10,000
- Expose as configurable parameter (global or per-arbitrary) for power users

#### 1.1.1 Performance Risk: Value Deduplication

> ⚠️ **Critical Performance Concern:** This is the single biggest performance risk in the implementation.

**The Risk:** If a user maps to a complex object (e.g., a large nested JSON or a class instance), naive stringification becomes $O(k \cdot \text{object\_size})$. Doing this 2,000 times (default $k_{\max}$) on every `size()` call could act as a DOS attack on the test suite.

**Example pathological case:**
```typescript
// Each codomain value is a 10KB JSON object
integer(0, 100000).map(x => generateLargeConfig(x))
  .size()  // Could stringify 2000 × 10KB = 20MB of data
```

#### Solution: Leverage Issue #464 (`hashCode`/`equals`)

> **Dependency:** This implementation should wait for or coordinate with [#464](https://github.com/fluent-check/fluent-check/issues/464), which proposes adding `hashCode()` and `equals()` methods to `Arbitrary`.

With #464 implemented, the deduplication becomes:

```typescript
private sampleCodomain(k: number): { distinctCount: number; totalSamples: number } {
  const rng = createSeededRng(this.fixedSeed)
  
  // Use hash-based Set with arbitrary's identity functions
  const hashFn = this.getHashCode()  // From mapped arbitrary or fallback
  const equalsFn = this.getEquals()
  const seen = new HashSet<B>(hashFn, equalsFn)
  
  for (let i = 0; i < k; i++) {
    const domainValue = this.baseArbitrary.sampleUniform(rng)
    const codomainValue = this.f(domainValue)
    seen.add(codomainValue)
  }
  return { distinctCount: seen.size, totalSamples: k }
}
```

**Benefits over `stableStringify`:**
- **O(1) hash computation** for primitives (integers, booleans, strings)
- **No string allocation** for intermediate comparisons
- **Handles circular references** gracefully
- **Composable** — `MappedArbitrary` can derive identity from base arbitrary when `f` is known-bijective

**MappedArbitrary Identity (Spike 3 from #464):**

For `MappedArbitrary`, the identity functions have three options:

| Scenario | `hashCode()` | `equals()` |
|----------|--------------|------------|
| `f` is known-bijective (e.g., `x => x * 2`) | Derive from base: `baseHash(f⁻¹(x))` | Derive from base |
| `f` is unknown | Fallback to stringify-based hash | Fallback to deep equality |
| User provides identity | Use provided `hashCode`/`equals` | Use provided |

For size estimation, the fallback is acceptable since we only call it $k$ times per `size()` invocation, not on every sample.

#### Fallback Mitigations (if #464 not yet available)

If implementing before #464, use these mitigations:

1. **Lazy evaluation (Critical):** `size()` must NOT compute on `MappedArbitrary` instantiation. Only compute when `.size()` is actually called, and cache the result.

2. **Length limit with fallback hashing:**
   ```typescript
   private stableStringify(value: unknown): string {
     const str = this.internalStringify(value)
     if (str.length > MAX_STRINGIFY_LENGTH) {
       // Fall back to simple hash to avoid memory blowup
       return `__hash__${djb2Hash(str)}`
     }
     return str
   }
   ```
   Default `MAX_STRINGIFY_LENGTH`: 1,000 characters.

3. **Depth limit:** Cap recursion depth in the stringifier (e.g., max 10 levels). Deeper objects get truncated representation.

4. **Memory budget:** If total `Set<string>` memory exceeds a threshold (e.g., 10MB), abort sampling early and return a conservative estimate based on samples collected so far.

**Trade-off:** These limits may cause hash collisions for genuinely distinct complex objects, slightly underestimating codomain size. This is acceptable — the alternative is unusable performance.

#### 1.2 Simple Sampling Estimator (Fraction-Based)

For large or estimated base domains, use a fraction-based estimator:

$$\hat{|C|} = \frac{d}{k} \cdot n$$

where:
- $k$ = sample size
- $d$ = observed distinct values in sample
- $n$ = known domain size (when exact)

**Rationale:** This is more intuitive than birthday inversion, easier to interpret, and naturally caps at $|D|$.

```typescript
private estimateByFraction(sampleSize: number): EstimatedSize {
  const baseSize = this.baseArbitrary.size()
  
  // Sample k domain values and count distinct codomain values
  // Uses fixed internal seed for determinism
  const { distinctCount: d, totalSamples: k } = this.sampleCodomain(sampleSize)
  
  if (baseSize.type === 'exact') {
    const n = baseSize.value
    const estimate = (d / k) * n
    
    // Wilson score interval (heuristic CI for distinct-count)
    const z = 1.96
    const pHat = d / k
    const denom = 1 + z * z / k
    const center = (pHat + z * z / (2 * k)) / denom
    const margin = (z / denom) * Math.sqrt((pHat * (1 - pHat)) / k + z * z / (4 * k * k))
    
    return {
      type: 'estimated',
      value: Math.min(Math.round(estimate), n),
      credibleInterval: [
        Math.max(d, Math.round(n * (center - margin))),  // At least d observed
        Math.min(n, Math.round(n * (center + margin)))   // At most n
      ]
    }
  }
  
  // For estimated base sizes: don't try to combine uncertainties
  // Just use the observed distinct count as a lower bound
  return {
    type: 'estimated',
    value: d,  // Conservative: we know there are at least d distinct values
    credibleInterval: [d, baseSize.value]  // Lower bound to base upper bound
  }
}

// Samples k values from domain, applies f, returns distinct count in codomain
private sampleCodomain(k: number): { distinctCount: number; totalSamples: number } {
  const rng = createSeededRng(this.fixedSeed)  // Deterministic
  const seen = new Set<string>()
  for (let i = 0; i < k; i++) {
    // CRITICAL: Must use uniform sampling, not biased sampling
    const domainValue = this.baseArbitrary.sampleUniform(rng)
    const codomainValue = this.f(domainValue)
    seen.add(this.stableStringify(codomainValue))
  }
  return { distinctCount: seen.size, totalSamples: k }
}
```

> ⚠️ **Critical: Uniform Sampling Requirement**
>
> The `sampleCodomain` method **must** use truly uniform sampling from the base arbitrary, not the standard PBT-biased sampling. Many PBT libraries (including fast-check) bias `integer()` toward edge cases (0, min, max, small values) to improve bug-finding. However, this bias violates Assumption A2 and will skew size estimates.
>
> **Implementation requirement:** Add a `sampleUniform(rng)` method to arbitraries that bypasses edge-case bias, or use the raw enumeration index for exact arbitraries.
>
> **Example of the problem:**
> ```typescript
> // If fc.integer(0, 1000) is biased toward 0, min, max:
> integer(0, 1000).map(x => x % 10).size()
> // Biased sampling might over-sample x=0, x=1000 → codomain values 0, 0
> // This underestimates the true codomain size (10)
> ```

**Sample Size Selection:**

Since $n$ is unknown, use a practical approach:
- For finite exact base domain: $k = \min(k_{\max}, 20\sqrt{n})$ where $n = |D|$
- For infinite/unknown domains: fixed budget (e.g., $k = 1000$)
- Default $k_{\max} = 2000$, configurable

Document trade-off: very large codomains will be poorly estimated with fixed budget.

#### 1.3 Optional: Known Function Patterns (Fast Paths)

When the base arbitrary is a simple integer range and `f` matches known forms, use exact formulas:

| Pattern | Formula | Example |
|---------|---------|---------|
| `x => x % k` | $\|C\| = \min(k, \|D\|)$ | `int(0,100).map(x => x % 10)` → 10 |
| `x => Math.abs(x)` on $[-m, m]$ | $\|C\| = m + 1 = \frac{\|D\| + 1}{2}$ | `int(-100,100).map(Math.abs)` → 101 |
| `x => Math.floor(x / k)` on $[a, b]$ | $\|C\| = \lfloor b/k \rfloor - \lfloor a/k \rfloor + 1$ | `int(0,100).map(x => Math.floor(x/10))` → 11 |

**Implementation:** Optional fast paths via static function inspection. Skip sampling entirely when pattern detected.

---

### Phase 2 (Future Work)

#### 2.1 HyperLogLog (Streaming/Parallel)

Only worthwhile for:
- Huge sampling volumes where storing all samples is impractical
- Streaming/parallel estimation with mergeable sketches

**Algorithm:**
1. Hash each value to uniform $[0, 1)$
2. Use $m$ buckets, track max leading zeros per bucket
3. Estimate: $\hat{n} = \frac{\alpha_m \cdot m^2}{\sum_{j=1}^{m} 2^{-M_j}}$

**Properties:**
- Space: $O(\log \log n)$ bits per bucket
- Accuracy: ±2% standard error with 1KB memory
- Mergeable: can combine estimates from parallel streams

**Recommendation:** Expose as opt-in advanced mode, not default.

#### 2.2 Birthday Paradox Estimator

$$\hat{n} = \frac{k^2}{2(k - d)}$$

Derived from expected collisions $\mathbb{E}[C] \approx \frac{k^2}{2n}$.

**Known Issues:**
1. **Division by zero:** If $d = k$ (no collisions), formula explodes
2. **Instability:** When collisions are few ($k - d = 1$), estimate is enormous and noisy
3. **Regime of validity:** Assumes collision probability is small ($k \lesssim \sqrt{n}$), but $n$ is unknown

**Guard Rails Required:**
```typescript
if (d === k) {
  // No collisions observed → only a lower bound, not an estimate
  return { type: 'estimated', value: Math.max(k, lowerBoundFromCI), ... }
}
```

**Recommendation:** Label as "experimental" if implemented; do not expose as default.

#### 2.3 Good-Turing Estimator

$$\hat{n} = d + \frac{f_1^2}{2 f_2}$$

where $f_1$ = singletons, $f_2$ = doubletons.

**Known Issues:**
- If $f_2 = 0$ (very sparse collisions), estimator explodes
- Relies on low-frequency counts being reliable—iffy for small samples
- Complexity and edge cases may outweigh benefits

**Recommendation:** Future work, behind "advanced/experimental" flag if implemented.

#### 2.4 Bayesian Estimation

$$P(d \mid n, k) = \frac{n!}{(n-d)!} \cdot S(k, d) / n^k$$

with Stirling numbers of the second kind.

**Known Issues:**
- Summing over all $n \in \{1, \ldots, |D|\}$ with factorials and Stirling numbers is computationally heavy
- Would need approximations, recursion, or precomputed tables
- Impractical for library `size()` method unless domain sizes are tiny

**Recommendation:** Theoretically elegant but not practical for v1. Document as "theoretically nice but not implemented."

---

## API Design

### Size Types (from PR #444)

```typescript
type ExactSize = { type: 'exact'; value: number }
type EstimatedSize = { type: 'estimated'; value: number; credibleInterval: [number, number] }
type ArbitrarySize = ExactSize | EstimatedSize
```

### MappedArbitrary.size() Implementation

```typescript
class MappedArbitrary<A, B> extends Arbitrary<B> {
  private cachedSize?: ArbitrarySize  // Cache for determinism and performance
  
  size(): ArbitrarySize {
    if (this.cachedSize) return this.cachedSize
    
    const baseSize = this.baseArbitrary.size()
    
    // Case 1: Small exact domain → enumerate for exact count
    if (baseSize.type === 'exact' && baseSize.value <= ENUMERATION_THRESHOLD) {
      this.cachedSize = {
        type: 'exact',
        value: this.countExactCodomain()
      }
      return this.cachedSize
    }
    
    // Case 2: Large exact domain → sample and estimate
    if (baseSize.type === 'exact') {
      this.cachedSize = this.estimateByFraction(SAMPLE_SIZE)
      return this.cachedSize
    }
    
    // Case 3: Already estimated base → conservative approach
    // Don't try to combine two independent uncertainties in a principled way.
    // Instead: sample to get a point estimate, but keep the base CI bounds.
    // This avoids pretending we have more precision than we actually do.
    const { distinctCount: d } = this.sampleCodomain(SAMPLE_SIZE)
    this.cachedSize = {
      type: 'estimated',
      value: Math.min(d, baseSize.value),  // At least d, but not more than base estimate
      credibleInterval: baseSize.credibleInterval  // Preserve base uncertainty
    }
    return this.cachedSize
  }
}
```

**Note on type compatibility:** The return type `ArbitrarySize` means `MappedArbitrary` would need to be typed as `Arbitrary<B>` (not `ExactSizeArbitrary<B>`), or PR #444's type declarations would need adjustment. See "Interaction with PR #444 Type System" section above.

### Configuration

```typescript
interface SizeEstimationConfig {
  enumerationThreshold: number  // Default: 5000
  maxSampleSize: number         // Default: 2000
  fixedSeed: number             // Internal RNG seed for determinism
}
```

---

## Composition Semantics

For chained maps `arb.map(f).map(g)`:

$$|C_{g \circ f}| \leq |C_f|$$

When $|C_g|$ is computed relative to $C_f$ (the intermediate arbitrary):

$$|C_{g \circ f}| \leq |C_g|$$

The conservative bound:

$$|C_{g \circ f}| \leq \min(|C_f|, |C_g|, |D|)$$

holds when $|C_g|$ is computed with respect to the intermediate `arb.map(f)`.

---

## Summary

| Approach | v1 | Future | Notes |
|----------|:--:|:------:|-------|
| Exact enumeration | ✅ | | For small exact domains |
| Fraction-based sampling | ✅ | | Simple, intuitive default |
| Known function patterns | ✅ | | Optional fast paths |
| HyperLogLog | | ✅ | Advanced/streaming mode |
| Birthday paradox | | ✅ | Experimental, needs guard rails |
| Good-Turing | | ✅ | Experimental, edge cases |
| Bayesian | | ❌ | Theoretical only |

---

## Empirical Validation Summary

All recommendations in this document are now enforced by the Monte Carlo suite introduced in [PR #468](https://github.com/fluent-check/fluent-check/pull/468). Run the simulations with:

```bash
npm run simulate:mapped-arbitrary
```

> **Current status (run on `pr-468@500f53e`, January 2025):** the suite fails in 4/8 simulations. The failures are informative—they quantify where the estimator breaks down and guide remediation.

### Latest Findings

#### Q1: Is the fraction estimator accurate for moderate codomain ratios?

**No.** Once we require the spec’s `<20% error & ≥80% Wilson coverage` guarantees, every configuration with $m \leq 0.7n$ fails. Representative numbers (mean relative error; coverage in parentheses):

| $m/n$ | $k=500$ | $k=1000$ | $k=2000$ |
|-------|---------|----------|----------|
| 0.1 | 685% (0%) | 532% (0%) | 332% (0%) |
| 0.3 | 207% (0%) | 183% (0%) | 142% (0%) |
| 0.5 | 90% (0%)  | 81% (0%)  | 65% (0%) |
| 0.7 | 37% (0%)  | 32% (0%)  | 22% (0%) |
| 0.9 | 8% (0%)   | 4.8% (0%) | **1.1% (71.5%)** |

Coverage collapses because the Wilson interval assumes unsaturated sampling; once $d \approx m$, the interval shrinks instead of widening.

#### Q2: Is $k = 20\sqrt{n}$ sufficient?

**Only when the codomain is already “large”.** For $n = 10\,000$ (hence $k = 2\,000$), the fraction of trials within 20% error is ~0% for $m/n \leq 0.7$, and only rises to 100% once $m/n = 0.9$. Even doubling the sample (40√n) barely helps until $m$ is extremely close to $n$. In other words: the sample-size rule is not the limiting factor; the estimator itself is.

#### Q3: How does the estimator behave for unbalanced functions?

The bias is dominated by the effective codomain size, not the skew. Highly skewed mappings still collapse to the same saturation failure when $m$ is small; when $m$ is large, the estimator is tolerant.

#### Q4: Fraction vs. birthday paradox estimator?

Running both estimators across the same grid shows the fraction estimator wins only **20%** of the time, and the birthday estimator never “explodes” (because $d \ll k$ in these scenarios). The ostensible advantage of the fraction estimator therefore disappears unless we deliberately stay in the $m \gg k$ regime.

#### Q5: Optimal enumeration threshold?

Enumeration is exact and linear in $n$, while sampling time is nearly constant but produces unusable hints for small codomains. The new simulations reinforce an aggressive enumeration threshold (~1 000 elements) until we can detect saturation dynamically.

#### Q6: Edge cases (constant, bijective)?

Deterministic cases behave as expected:

| Function | True M | Mean Estimate | Ratio |
|----------|--------|---------------|-------|
| Identity | 10 000 | 9 757 | 0.98× |
| Near-bijective | 9 999 | 9 755 | 0.98× |
| Constant | 1 | 20 | 20× |
| Binary | 2 | 40 | 20× |
| Sqrt-collapse | 100 | 1 987 | 19.9× |

The overestimation for constant/binary mappings is unavoidable: $\hat{m} = \frac{m}{k} \cdot n$ once $d = m$.

#### Q7: Does chaining maps make things worse?

Not materially. Chained maps stay bounded—the dominant error still comes from the innermost codomain saturating the sample.

#### Q8: Does uniform sampling matter for cluster/step functions?

Uniform sampling itself still produces **687%–1900%** relative error for cluster sizes 10–1 000 (because those codomains are small). Biased sampling is even worse, but the baseline already violates the spec, so the uniform-vs-biased distinction is moot until the estimator changes.

### Key Limitations (updated)

1. **Saturation dominates:** As soon as $m \lesssim k$, estimates inflate by 2×–20× and Wilson coverage collapses to ~0%.
2. **Sample-size tuning cannot help:** Increasing $k$ merely delays saturation; it does not restore the assumed $d/k \approx m/n$ relationship.
3. **CI semantics break:** The Wilson bound was derived for unconstrained Bernoulli trials. When $d$ is capped by $m$, the interval shrinks toward $d$ instead of expanding, so it never covers the truth.
4. **Design implication:** `size()` must either (a) detect saturation and refuse to guess, or (b) switch to an alternate estimator/enumeration when the codomain is suspected to be small.

### Decision Implications

- **Do not ship the current `size()` plan as-is.** It will routinely return 5×–20× overestimates while claiming 95% confidence.
- **Treat `d/k` as a saturation detector.** When $d/k \rightarrow 1$ the estimator is invalid; return “unknown” or fall back to enumeration.
- **Raise the visibility of enumeration.** For most `MappedArbitrary` instances used in practice (finite enums, tagged unions, lookups), exact counting is still feasible and preferable.
- **Reframe documentation.** Instead of promising a “hint,” state the precise conditions where the hint is trustworthy and surface the failure probability to users.

## Alternate Estimators and Mitigation Options

The simulations show that a single fraction-based estimator cannot cover the entire design space. We need a toolkit of strategies and a dispatch policy.

### 1. Deterministic Enumeration (Status: Recommended Default)

- **When to use:** If the upstream arbitrary has `size().type === 'exact'` and `value ≤ ENUMERATION_THRESHOLD`.
- **Action:** Materialize all domain values, apply `map`, and deduplicate. This produces the ground truth and satisfies Specs 1 & 6 immediately.
- **Next step:** Raise the threshold to at least **1 000** (as suggested by Simulation 5) once `hashCode`/`equals` (#464) lands, otherwise default to ~250 elements to keep `JSON.stringify` costs bounded.

### 2. Saturation-Aware Fraction Estimator

- **Idea:** Keep the current estimator but guard it with `saturation = d / k`. If `saturation ≥ 0.4` (empirically where error >50%), report:  
  `EstimatedSize { type: 'distinct-count-hint', value: undefined, reason: 'codomain saturated; fell back to enumeration threshold' }`.
- **Benefit:** Preserves the estimator for the one regime where it works ($m \gg k$) while avoiding misleading numbers elsewhere.

### 3. Birthday / Capture–Recapture Hybrid

- **Formula:** $\hat{m}_{\text{birthday}} = \frac{k^2}{2(k-d)}$; when combined with Horvitz–Thompson weighting we can tolerate higher saturation.
- **Guard rails:** Only run when `d ≤ k - 3` (to avoid division-by-zero) and surface the variance estimate from the delta method.
- **Why bother:** In the current grid the birthday estimator produced lower RMSE in 80% of cases without exploding, so offering it as an optional strategy (perhaps behind `estimationType: 'population-inference'`) is reasonable.

### 4. Coverage-Based Estimators (Good–Turing / Chao1)

- **Approach:** Use the count of singletons/doubletons to extrapolate unseen mass:  
  $\hat{m}_{\text{Chao1}} = d + \frac{f_1^2}{2 f_2}$ (where $f_1$ is the number of values seen once, $f_2$ twice).  
- **Pros:** Works better when the codomain is small but not tiny, because it explicitly models missing mass.
- **Cons:** Needs raw frequency histograms, so we must store counts instead of just “seen/not seen.”
- **Plan:** Prototype once `hashCode`/`equals` exist so frequency tables are cheap.

### 5. Hash-Based Sketches (HyperLogLog / LogLog-Beta)

- **Context:** HyperLogLog (HLL) provides ~1.04/√m relative error with small memory. It excels when $m$ is large and the mapped values can be hashed inexpensively.
- **Requirements:** Efficient hashing (#464), deterministic seeds, and ability to merge sketches.
- **Use case:** Large codomain arbitraries where enumeration is impossible but we can tolerate ±2% error (a regime the current estimator handles, but HLL would provide statistical guarantees and well-behaved confidence intervals).

### 6. Adaptive Sampling

- **Mechanism:** Start with a cheap sample size (e.g., 200). If `d/k` is low, progressively increase $k$ toward $20\sqrt{n}`. If saturation rises, abort and switch to enumeration/coverage estimator.
- **Outcome:** Avoids spending the full sampling budget on cases that are doomed anyway and gives us a principled way to decline an estimate.

These options are not mutually exclusive. A practical plan could be:

1. **Enumerate** whenever `n ≤ ENUMERATION_THRESHOLD`.
2. **Adaptive sample** for the rest; bail out if saturation is detected.
3. **If still unsaturated**, choose between:
   - Fraction estimator (fast, no extra memory)
   - Birthday estimator (if `d ≤ k - 3`)
   - HLL (if hashing is available and the caller opts in)
4. **If saturated**, return an `EstimatedSize` with `estimationType: 'infeasible'` so downstream logic can react (e.g., reduce chaining depth or narrow the arbitrary).

## Next Steps

1. **Document reality today**  
   - Update user-facing docs / README to say `size()` is disabled for mapped arbitraries until saturation-safe estimators ship.  
   - Expose the simulation summary (CSV + console output) in the PR so reviewers can reproduce the failure.

2. **Decide on the fallback tree**  
   - Choose thresholds for enumeration vs. sampling.  
   - Agree on what to return when saturation is detected (`ExactSize`, `EstimatedSize` with `reason`, or an error).

3. **Prototype alternate estimators**  
   - Build a spike branch that plugs the birthday estimator and Chao1 into the simulation harness.  
   - Once #464 is available, implement HLL or frequency-based estimators to compare empirically.

4. **Keep the validation suite red until resolved**  
   - The failure is the signal; do not relax assertions.  
   - Treat “all simulations pass” as a gate for re-enabling `MappedArbitrary.size()`.

---

## Implementation Recommendations

The following table summarizes all recommendations from this analysis, prioritized for implementation:

| Category | Recommendation | Priority | Rationale |
|----------|----------------|----------|-----------|
| **Performance** | Implement lazy evaluation for `size()`. Do NOT compute on `MappedArbitrary` instantiation. | 🔴 Critical | Prevents unnecessary computation when `size()` is never called |
| **Performance** | Coordinate with [#464](https://github.com/fluent-check/fluent-check/issues/464) for `hashCode`/`equals` identity functions. | 🟠 High | Eliminates stringify overhead; enables O(1) deduplication for primitives |
| **Performance** | (Fallback) Add length limits/hashing to stringify if implementing before #464. | 🟡 Medium | Temporary mitigation until #464 lands |
| **Correctness** | Ensure `sampleCodomain` uses raw uniform sampling, bypassing standard PBT bias (min/max/0). | 🟠 High | Biased sampling violates A2 and skews estimates for cluster/step functions |
| **Correctness** | Always enforce `value >= d` (observed distinct count) as lower bound. | 🟠 High | You can never have fewer distinct elements than you observed |
| **Type System** | Add `estimationType` field to distinguish `'distinct-count-hint'` vs `'population-inference'`. | 🟡 Medium | Enables future optimizations for combining estimates |
| **Documentation** | Explicitly document: "Size is a heuristic hint. Do not rely on it for logic validation." | 🟡 Medium | Prevents user confusion about precision guarantees |
| **Correctness** | Add saturation detection: if `d/k ≥ 0.4`, fall back to enumeration or “unknown” estimate. | 🔴 Critical | Prevents 5×–20× overestimates reported by Simulation 1 |
| **Correctness** | Prefer enumeration whenever `n ≤ 1000` until #464 lands. | 🔴 Critical | Only enumerated paths currently meet the spec |
| **Testing** | Simulation suite now enforced; **currently failing** (Sim 1,2,4,8). Keep it red until estimator choice is resolved. | 🟡 Medium | Prevents silent regressions / document drift |
| **Future** | Consider HyperLogLog only if `HashSet` memory becomes a bottleneck (unlikely for $k = 2000$). | 🟢 Low | Current approach is simpler and sufficient |
| **Future** | Consider birthday-paradox estimator as experimental alternative. | 🟢 Low | Higher variance, division-by-zero edge cases |

---

## Appendix: Validation of Assumptions through Simulation

The following Monte Carlo simulations empirically validate the mathematical assumptions and estimator recommendations.

> **Implementation:** [`test/simulations/mapped-arbitrary-validation.ts`](../../test/simulations/mapped-arbitrary-validation.ts)
> **Run:** `npm run simulate:mapped-arbitrary`
> **Results:** See [Empirical Validation Summary](#empirical-validation-summary) above.

### Core Estimator Functions

The simulation file implements the estimators described in this document:

| Function | Description | Implementation |
|----------|-------------|----------------|
| `fractionEstimate(d, k, n)` | Fraction estimator: $\hat{m} = \frac{d}{k} \cdot n$ | [Line 74](../../test/simulations/mapped-arbitrary-validation.ts#L74) |
| `birthdayEstimate(d, k)` | Birthday paradox: $\hat{m} = \frac{k^2}{2(k-d)}$ | [Line 82](../../test/simulations/mapped-arbitrary-validation.ts#L82) |
| `wilsonScoreCI(d, k, n)` | Wilson score confidence interval | [Line 91](../../test/simulations/mapped-arbitrary-validation.ts#L91) |
| `sampleDistinctCount(n, k, f, rng)` | Simulate uniform sampling | [Line 131](../../test/simulations/mapped-arbitrary-validation.ts#L131) |
| `sampleDistinctCountBiased(...)` | Simulate biased (PBT-style) sampling | [Line 149](../../test/simulations/mapped-arbitrary-validation.ts#L149) |

### Simulation Strategy

> **Success Criteria:** These simulations validate that the estimator is "good enough for a `size()` hint" — not that it's statistically optimal. A `size()` method in a PBT library is used for heuristic decisions (e.g., choosing sample counts, estimating exhaustive search feasibility). Success means:
> - Estimates within ~20% for moderate cases
> - Graceful degradation for edge cases (not catastrophic failures)
> - CIs that contain the true value "most of the time" (≥80%)

Each simulation follows the pattern:
1. **Ground Truth**: Establish known parameters (true $m$, true $n$, known function $f$)
2. **Sampling**: Simulate the sampling process under controlled conditions
3. **Estimation**: Apply our estimators to the simulated data
4. **Evaluation**: Compare estimates to ground truth across many trials
5. **Metrics**: Compute bias, MSE, coverage, and other relevant statistics

---

### Simulation 1: Fraction Estimator Accuracy

> **Implementation:** [`simulateFractionEstimator()`](../../test/simulations/mapped-arbitrary-validation.ts#L186)

**Hypothesis**: $\hat{m} = \frac{d}{k} \cdot n$ provides accurate estimates for moderate codomain ratios.

**Validates**: Assumption A4 (Fraction Estimator Validity)

**Pass criteria**: < 20% relative error for ratios 0.1–0.9; CI coverage ≥ 80%

**Falsifies if**: Systematic bias > 20% for moderate ratios, or coverage < 80%

---

### Simulation 2: Sample Size Adequacy

> **Implementation:** [`validateSampleSizeFormula()`](../../test/simulations/mapped-arbitrary-validation.ts#L240)

**Hypothesis**: $k = \min(k_{\max}, 20\sqrt{n})$ provides adequate accuracy.

**Validates**: Assumption A5 (Sample Size Sufficiency)

**Pass criteria**: > 70% of estimates within 20% error at $k = 20\sqrt{n}$

**Falsifies if**: < 60% accuracy rate, or no plateau observed

---

### Simulation 3: Balanced vs Unbalanced Functions

> **Implementation:** [`simulateUnbalancedFunctions()`](../../test/simulations/mapped-arbitrary-validation.ts#L293)

**Hypothesis**: The estimator degrades gracefully for unbalanced functions (non-uniform pre-image sizes).

**Validates**: Robustness of A4 under violation of uniform codomain assumption

For highly skewed maps, the estimator approximates "effective codomain size" (perplexity) rather than literal count—reasonable behavior for a heuristic.

**Pass criteria**: Graceful degradation; no catastrophic failures

**Falsifies if**: Estimate off by orders of magnitude for moderate skew

---

### Simulation 4: Birthday Paradox Estimator Comparison

> **Implementation:** [`compareBirthdayVsFraction()`](../../test/simulations/mapped-arbitrary-validation.ts#L361)

**Hypothesis**: Birthday paradox estimator $\hat{m} = \frac{k^2}{2(k-d)}$ is less robust than fraction estimator.

**Validates**: Design decision to use fraction estimator as default

**Pass criteria**: Fraction ≤ Birthday RMSE in ≥ 60% of cases

**Falsifies if**: Birthday consistently outperforms fraction

---

### Simulation 5: Enumeration Threshold Trade-off

> **Implementation:** [`analyzeEnumerationThreshold()`](../../test/simulations/mapped-arbitrary-validation.ts#L429)

**Hypothesis**: Enumeration threshold of 5,000–10,000 provides good accuracy/performance trade-off.

**Validates**: Configuration decision (`ENUMERATION_THRESHOLD`)

**Pass criteria**: Identifiable crossover point exists; sampling error < 15% for $n > 5000$

**Falsifies if**: Enumeration still faster at $n = 50000$, or sampling error > 30%

---

### Simulation 6: Edge Cases and Pathological Functions

> **Implementation:** [`validateEdgeCases()`](../../test/simulations/mapped-arbitrary-validation.ts#L487)

**Hypothesis**: The estimator handles edge cases gracefully.

| Case | Function | Expected $m$ |
|------|----------|--------------|
| Constant | $f(x) = 42$ | 1 |
| Identity | $f(x) = x$ | $n$ |
| Binary | $f(x) = x \bmod 2$ | 2 |
| Near-bijective | $f(0) = f(1) = 0$, else $f(x) = x$ | $n - 1$ |
| Sqrt-collapse | $f(x) = x \bmod \sqrt{n}$ | $\sqrt{n}$ |

**Identity case**: For $n = 10000$, $k = 1000$: expected $d \approx n(1 - e^{-k/n}) \approx 951$, giving $\hat{m} \approx 9510$ (~5% error). Acceptable for heuristic use.

**Pass criteria**: Constant/binary always exact; no order-of-magnitude errors

**Falsifies if**: $d \neq m$ for deterministic cases, or catastrophic failures

---

### Simulation 7: Chained Map Composition

> **Implementation:** [`validateChainedMaps()`](../../test/simulations/mapped-arbitrary-validation.ts#L536)

**Hypothesis**: Size estimation composes correctly for chained maps.

**Validates**: Composition semantics

Test case: `int(0, n-1).map(x => x % 100).map(x => x % 10)` — true sizes: $n \to 100 \to 10$

**Pass criteria**: Both direct and chained estimates within 2x of true value

**Falsifies if**: Estimates diverge significantly or are orders of magnitude off

---

### Simulation 8: Cluster Mapping (Step Functions)

> **Implementation:** [`validateClusterMapping()`](../../test/simulations/mapped-arbitrary-validation.ts#L594) and [`validateUniformVsBiased()`](../../test/simulations/mapped-arbitrary-validation.ts#L631)

**Hypothesis**: The estimator handles step functions $f(x) = \lfloor x / c \rfloor$ correctly, and uniform sampling matters.

**Validates**: Assumption A2 (Uniform Sampling)

| Cluster size $c$ | Expected $m$ |
|------------------|--------------|
| 10 | 1000 |
| 100 | 100 |
| 1000 | 10 |

**Pass criteria**: Uniform sampling < 20% error; biased sampling shows measurable degradation

**Falsifies if**: Uniform > 30% error, or bias doesn't affect results

---

### Summary: Simulation Test Matrix

| Simulation | Validates | Pass Criterion |
|------------|-----------|----------------|
| 1. Fraction Estimator | A4 | < 20% error for 0.1–0.9 ratios |
| 2. Sample Size | A5 | > 70% within 20% at $k = 20\sqrt{n}$ |
| 3. Balanced vs Unbalanced | A4 robustness | Graceful degradation |
| 4. Birthday Comparison | Design decision | Fraction ≤ Birthday ≥ 60% |
| 5. Enumeration Threshold | Configuration | Crossover point exists |
| 6. Edge Cases | Boundaries | Constants exact; no catastrophic failures |
| 7. Chained Maps | Composition | Estimates within 2x |
| 8. Cluster Mapping | A2 | Uniform < 20%; bias degrades |

---

## References

- Flajolet, P., & Martin, G. N. (1985). Probabilistic counting algorithms for data base applications
- Heule, S., Nunkesser, M., & Hall, A. (2013). HyperLogLog in practice
- Charikar, M., Chen, K., & Farach-Colton, M. (2002). Finding frequent items in data streams
- Bar-Yossef, Z., et al. (2002). Counting distinct elements in a data stream
