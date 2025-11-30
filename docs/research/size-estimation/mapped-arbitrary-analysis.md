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

The recommendations in this document require empirical validation through Monte Carlo simulations before implementation. Unlike the filter arbitrary analysis (where assumptions were validated in [PR #463](https://github.com/fluent-check/fluent-check/pull/463)), the mapped arbitrary estimator has not yet been validated.

### Key Questions Requiring Validation

| Question | Simulation | Status |
|----------|------------|--------|
| Is the fraction estimator accurate for moderate codomain ratios? | Simulation 1 | 🔬 Pending |
| Is $k = 20\sqrt{n}$ sufficient for reliable estimation? | Simulation 2 | 🔬 Pending |
| How does the estimator degrade for unbalanced functions? | Simulation 3 | 🔬 Pending |
| Is fraction estimator better than birthday paradox? | Simulation 4 | 🔬 Pending |
| What's the optimal enumeration threshold? | Simulation 5 | 🔬 Pending |
| Do edge cases (constant, bijective) work correctly? | Simulation 6 | 🔬 Pending |
| Does chained map composition propagate errors acceptably? | Simulation 7 | 🔬 Pending |
| Does uniform sampling matter for cluster/step functions? | Simulation 8 | 🔬 Pending |

### Validation Priority

**High priority** (must validate before v1):
1. Simulation 1 (Fraction Estimator Accuracy) — core algorithm correctness
2. Simulation 6 (Edge Cases) — boundary behavior
3. Simulation 4 (Birthday Comparison) — validates design decision
4. Simulation 8 (Cluster Mapping) — validates uniform sampling requirement

**Medium priority** (validate during v1 development):
5. Simulation 2 (Sample Size) — configuration tuning
6. Simulation 5 (Enumeration Threshold) — configuration tuning

**Lower priority** (can validate after v1):
7. Simulation 3 (Balanced vs Unbalanced) — robustness analysis
8. Simulation 7 (Chained Maps) — composition behavior

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
| **Testing** | Run Simulations 1, 4, 6, 8 before v1 implementation. | 🟡 Medium | Validates core algorithm assumptions |
| **Future** | Consider HyperLogLog only if `HashSet` memory becomes a bottleneck (unlikely for $k = 2000$). | 🟢 Low | Current approach is simpler and sufficient |
| **Future** | Consider birthday-paradox estimator as experimental alternative. | 🟢 Low | Higher variance, division-by-zero edge cases |

### Implementation Checklist

```
Dependencies:
[ ] Coordinate with #464 (hashCode/equals) - preferred approach
[ ] OR implement fallback stringify mitigations if #464 not ready

Performance:
[ ] size() is lazy (computed on first call, not instantiation)
[ ] size() result is cached per instance
[ ] Use hashCode()/equals() from #464 for deduplication (preferred)
[ ] OR (fallback): stableStringify has length limit (default: 1000 chars)
[ ] OR (fallback): stableStringify has depth limit (default: 10 levels)
[ ] OR (fallback): stableStringify falls back to hashing for large objects

Correctness:
[ ] sampleCodomain uses sampleUniform(), not biased sample()
[ ] Estimate value is always >= observed distinct count d
[ ] CI lower bound is always >= d
[ ] CI upper bound is always <= domain size n

Type System:
[ ] EstimatedSize includes optional estimationType field
[ ] MappedArbitrary.size() sets estimationType: 'distinct-count-hint'

Documentation:
[ ] JSDoc on size() explains heuristic nature
[ ] README mentions size() limitations for mapped arbitraries
```

---

## Next Steps

### Dependencies
- [ ] **Coordinate with [#464](https://github.com/fluent-check/fluent-check/issues/464)** — `hashCode`/`equals` provides the ideal deduplication mechanism
  - If #464 lands first: use `hashCode()`/`equals()` for `sampleCodomain`
  - If this lands first: implement fallback stringify mitigations, refactor when #464 lands
- [ ] Provide input to **Spike 3** in #464 regarding `MappedArbitrary` identity derivation

### Pre-Implementation Validation
- [ ] Implement validation simulations in `test/simulations/mapped-arbitrary-validation.ts`
- [ ] Run Simulation 1 (Fraction Estimator) to validate core algorithm
- [ ] Run Simulation 6 (Edge Cases) to validate boundary behavior
- [ ] Run Simulation 4 (Birthday Comparison) to confirm design decision
- [ ] Run Simulation 8 (Cluster Mapping) to validate uniform sampling requirement

### Implementation (Critical Path)
- [ ] Add `sampleUniform()` method to base `Arbitrary` class (bypasses PBT edge-case bias)
- [ ] Implement deduplication using #464's `hashCode()`/`equals()` (or fallback stringify)
- [ ] Implement lazy, cached `MappedArbitrary.size()` with validated parameters
- [ ] Add `estimationType: 'distinct-count-hint'` to returned `EstimatedSize`

### Configuration Tuning
- [ ] Tune `ENUMERATION_THRESHOLD` based on Simulation 5 results
- [ ] Tune sample size formula based on Simulation 2 results

### Documentation & Polish
- [ ] Document validation results in this file (like PR #463 for filter arbitrary)
- [ ] Add JSDoc explaining heuristic nature of `size()`
- [ ] Consider HPD intervals if normal approximation CI has poor coverage

---

## Appendix: Validation of Assumptions through Simulation

The following Monte Carlo simulations are proposed to empirically validate the mathematical assumptions and estimator recommendations.

> **Implementation:** Create in `test/simulations/mapped-arbitrary-validation.ts`
> **Goal:** Provide empirical evidence to support (or falsify) the mathematical assumptions before implementation.

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

**Hypothesis**: The fraction estimator $\hat{m} = \frac{d}{k} \cdot n$ provides accurate estimates for moderate codomain ratios.

**Validates**: Assumption A4 (Fraction Estimator Validity)

**Setup**:
```typescript
interface FractionEstimatorParams {
  domainSizes: number[]         // e.g., [100, 1000, 10000]
  codomainRatios: number[]      // m/n ratios, e.g., [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]
  sampleSizes: number[]         // e.g., [50, 100, 500, 1000, 2000]
  numTrials: number             // e.g., 10000
}
```

**Algorithm**:
```typescript
function simulateFractionEstimator(params: FractionEstimatorParams): EstimatorResults {
  const results: EstimatorResults = {}
  
  for (const n of params.domainSizes) {
    for (const ratio of params.codomainRatios) {
      const trueM = Math.round(n * ratio)  // Ground truth codomain size
      
      for (const k of params.sampleSizes) {
        let sumError = 0, sumSquaredError = 0
        let sumEstimate = 0
        let coverageCount = 0
        
        for (let trial = 0; trial < params.numTrials; trial++) {
          // Simulate: sample k values from domain, track distinct codomain values
          // Using modular function f(x) = x % trueM as balanced mapping
          const seen = new Set<number>()
          for (let i = 0; i < k; i++) {
            const domainValue = Math.floor(Math.random() * n)
            const codomainValue = domainValue % trueM  // Balanced mapping
            seen.add(codomainValue)
          }
          const d = seen.size
          
          // Fraction estimate
          const estimate = (d / k) * n
          
          // Compute CI (Wilson score interval for proportion, scaled)
          const pHat = d / k
          const z = 1.96
          const denominator = 1 + z * z / k
          const center = (pHat + z * z / (2 * k)) / denominator
          const margin = z * Math.sqrt((pHat * (1 - pHat) + z * z / (4 * k)) / k) / denominator
          const ciLow = Math.max(d, n * (center - margin))
          const ciHigh = Math.min(n, n * (center + margin))
          
          // Accumulate metrics
          const error = estimate - trueM
          sumError += error
          sumSquaredError += error * error
          sumEstimate += estimate
          
          if (ciLow <= trueM && trueM <= ciHigh) coverageCount++
        }
        
        const numTrials = params.numTrials
        results[`n=${n},ratio=${ratio},k=${k}`] = {
          trueM,
          meanEstimate: sumEstimate / numTrials,
          bias: sumError / numTrials,
          mse: sumSquaredError / numTrials,
          rmse: Math.sqrt(sumSquaredError / numTrials),
          relativeError: Math.abs(sumError / numTrials) / trueM,
          coverage: coverageCount / numTrials
        }
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- Low bias (< 10%) for codomain ratios 0.1–0.9
- Higher bias for extreme ratios (< 0.05 or > 0.95)
- RMSE decreases as sample size increases
- Coverage should be ≈95% for 95% CI

**What Would Falsify**:
- Systematic bias > 20% for moderate codomain ratios
- Coverage significantly below 90%
- No improvement in accuracy as sample size increases

---

### Simulation 2: Sample Size Adequacy

**Hypothesis**: Sample size $k = \min(k_{\max}, 20\sqrt{n})$ provides adequate accuracy.

**Validates**: Assumption A5 (Sample Size Sufficiency)

**Setup**:
```typescript
interface SampleSizeParams {
  domainSizes: number[]         // e.g., [100, 1000, 10000, 100000]
  codomainRatios: number[]      // e.g., [0.1, 0.5, 0.9]
  sampleSizeMultipliers: number[]  // Multipliers of sqrt(n), e.g., [5, 10, 20, 50, 100]
  kMax: number                  // e.g., 2000
  numTrials: number             // e.g., 5000
  targetAccuracy: number        // e.g., 0.1 (10% relative error)
}
```

**Algorithm**:
```typescript
function validateSampleSizeFormula(params: SampleSizeParams): SampleSizeResults {
  const results: SampleSizeResults = {}
  
  for (const n of params.domainSizes) {
    for (const ratio of params.codomainRatios) {
      const trueM = Math.round(n * ratio)
      
      for (const multiplier of params.sampleSizeMultipliers) {
        const k = Math.min(params.kMax, Math.round(multiplier * Math.sqrt(n)))
        
        let achievedAccuracy = 0
        let sumRelativeError = 0
        
        for (let trial = 0; trial < params.numTrials; trial++) {
          // Same simulation as above
          const seen = new Set<number>()
          for (let i = 0; i < k; i++) {
            const domainValue = Math.floor(Math.random() * n)
            seen.add(domainValue % trueM)
          }
          const d = seen.size
          const estimate = (d / k) * n
          
          const relativeError = Math.abs(estimate - trueM) / trueM
          sumRelativeError += relativeError
          if (relativeError <= params.targetAccuracy) achievedAccuracy++
        }
        
        results[`n=${n},ratio=${ratio},mult=${multiplier}`] = {
          k,
          kFormula: `${multiplier}*sqrt(${n})`,
          meanRelativeError: sumRelativeError / params.numTrials,
          accuracyRate: achievedAccuracy / params.numTrials  // % within target
        }
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- At $k = 20\sqrt{n}$, accuracy rate should be > 80%
- Accuracy should plateau (diminishing returns beyond a certain $k$)
- For very small codomains, accuracy limited by codomain size, not sample size

**What Would Falsify**:
- $k = 20\sqrt{n}$ achieves < 60% accuracy rate
- No plateau observed (would suggest unbounded sample size needed)

---

### Simulation 3: Balanced vs Unbalanced Functions

**Hypothesis**: The fraction estimator degrades gracefully for unbalanced functions (non-uniform pre-image sizes).

**Validates**: Robustness of A4 under violation of uniform codomain assumption

**Setup**:
```typescript
interface BalancednessParams {
  domainSize: number           // e.g., 10000
  codomainSize: number         // e.g., 100
  skewFactors: number[]        // e.g., [1, 2, 5, 10] (1 = balanced, 10 = highly skewed)
  sampleSize: number           // e.g., 1000
  numTrials: number            // e.g., 10000
}

// Skew factor k means: codomain value 0 has k^m weight, value 1 has k^(m-1), etc.
// This creates exponentially unbalanced pre-images
```

**Algorithm**:
```typescript
function simulateUnbalancedFunctions(params: BalancednessParams): BalancednessResults {
  const results: BalancednessResults = {}
  const { domainSize: n, codomainSize: m, sampleSize: k } = params
  
  for (const skew of params.skewFactors) {
    // Create mapping probabilities (exponential decay with skew factor)
    const weights = Array.from({ length: m }, (_, i) => Math.pow(skew, m - 1 - i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    const probs = weights.map(w => w / totalWeight)
    const cumulativeProbs = probs.reduce((acc, p, i) => {
      acc.push((acc[i - 1] || 0) + p)
      return acc
    }, [] as number[])
    
    let sumEstimate = 0, sumSquaredError = 0
    
    for (let trial = 0; trial < params.numTrials; trial++) {
      // Sample according to skewed distribution
      const seen = new Set<number>()
      for (let i = 0; i < k; i++) {
        const r = Math.random()
        const codomainValue = cumulativeProbs.findIndex(cp => r <= cp)
        seen.add(codomainValue)
      }
      const d = seen.size
      const estimate = (d / k) * n
      
      sumEstimate += estimate
      sumSquaredError += (estimate - m) * (estimate - m)
    }
    
    // Calculate "effective" codomain size (entropy-based)
    const entropy = -probs.reduce((h, p) => h + (p > 0 ? p * Math.log2(p) : 0), 0)
    const effectiveM = Math.pow(2, entropy)  // Perplexity
    
    results[`skew=${skew}`] = {
      trueM: m,
      effectiveM: Math.round(effectiveM),
      meanEstimate: sumEstimate / params.numTrials,
      rmse: Math.sqrt(sumSquaredError / params.numTrials),
      bias: (sumEstimate / params.numTrials) - m,
      biasToEffective: (sumEstimate / params.numTrials) - effectiveM
    }
  }
  return results
}
```

**Expected Outcome**:
- For balanced functions (skew=1), estimate ≈ true $m$
- For highly skewed functions, estimate ≈ "effective" codomain size (perplexity), which is smaller than true $m$
- Degradation should be gradual, not catastrophic

> **Interpretation:** For highly skewed maps, the estimator approximates an "effective codomain size" rather than the literal number of possible outputs. This is actually reasonable behavior — if 99% of samples hit only 10% of the codomain, knowing there are theoretically more values is less useful than knowing "effectively about this many distinct values are reachable with typical sampling."

**What Would Falsify**:
- Catastrophic failure (estimate off by orders of magnitude) for moderate skew
- Estimate systematically worse than trivial bounds

---

### Simulation 4: Birthday Paradox Estimator Comparison

**Hypothesis**: The birthday paradox estimator $\hat{m} = \frac{k^2}{2(k-d)}$ is less robust than the fraction estimator.

**Validates**: Design decision to use fraction estimator as default (Section 2.2)

**Setup**:
```typescript
interface BirthdayComparisonParams {
  domainSizes: number[]         // e.g., [1000, 10000]
  codomainRatios: number[]      // e.g., [0.01, 0.1, 0.5, 0.9, 0.99]
  sampleSizes: number[]         // e.g., [50, 100, 200, 500]
  numTrials: number             // e.g., 10000
}
```

**Algorithm**:
```typescript
function compareBirthdayVsFraction(params: BirthdayComparisonParams): ComparisonResults {
  const results: ComparisonResults = {}
  
  for (const n of params.domainSizes) {
    for (const ratio of params.codomainRatios) {
      const trueM = Math.round(n * ratio)
      
      for (const k of params.sampleSizes) {
        let fractionMSE = 0, birthdayMSE = 0
        let birthdayExploded = 0  // Count of d === k (division by zero)
        let birthdayUnstable = 0  // Count of (k - d) <= 2 (highly unstable)
        
        for (let trial = 0; trial < params.numTrials; trial++) {
          const seen = new Set<number>()
          for (let i = 0; i < k; i++) {
            seen.add(Math.floor(Math.random() * n) % trueM)
          }
          const d = seen.size
          
          // Fraction estimate
          const fractionEst = (d / k) * n
          fractionMSE += (fractionEst - trueM) ** 2
          
          // Birthday estimate
          if (d === k) {
            birthdayExploded++
            birthdayMSE += (n - trueM) ** 2  // Worst case error
          } else {
            const birthdayEst = (k * k) / (2 * (k - d))
            if (k - d <= 2) birthdayUnstable++
            birthdayMSE += (birthdayEst - trueM) ** 2
          }
        }
        
        const numTrials = params.numTrials
        results[`n=${n},ratio=${ratio},k=${k}`] = {
          trueM,
          fractionRMSE: Math.sqrt(fractionMSE / numTrials),
          birthdayRMSE: Math.sqrt(birthdayMSE / numTrials),
          birthdayExplodedRate: birthdayExploded / numTrials,
          birthdayUnstableRate: birthdayUnstable / numTrials,
          fractionBetter: fractionMSE < birthdayMSE
        }
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- Birthday estimator should explode (d=k) frequently for large codomains (ratio > 0.9)
- Birthday RMSE should be higher than fraction RMSE in most cases
- Birthday should only be competitive for small codomains with many samples

**What Would Falsify**:
- Birthday estimator consistently outperforming fraction estimator
- Low explosion/instability rates across all parameters

---

### Simulation 5: Enumeration Threshold Trade-off

**Hypothesis**: Enumeration threshold of 5,000–10,000 provides good accuracy/performance trade-off.

**Validates**: Configuration decision (Section 1.1, `ENUMERATION_THRESHOLD`)

**Setup**:
```typescript
interface ThresholdParams {
  domainSizes: number[]         // e.g., [100, 500, 1000, 5000, 10000, 50000]
  codomainRatios: number[]      // e.g., [0.1, 0.5]
  sampleSize: number            // e.g., 1000
  numTrials: number             // e.g., 1000
}
```

**Algorithm**:
```typescript
function analyzeEnumerationThreshold(params: ThresholdParams): ThresholdResults {
  const results: ThresholdResults = {}
  
  for (const n of params.domainSizes) {
    for (const ratio of params.codomainRatios) {
      const trueM = Math.round(n * ratio)
      
      // Time enumeration
      const enumStart = performance.now()
      const enumerated = new Set<number>()
      for (let x = 0; x < n; x++) {
        enumerated.add(x % trueM)
      }
      const enumTime = performance.now() - enumStart
      const enumResult = enumerated.size  // Always exact
      
      // Time sampling estimation
      const sampleStart = performance.now()
      let sumEstimate = 0
      for (let trial = 0; trial < params.numTrials; trial++) {
        const seen = new Set<number>()
        for (let i = 0; i < params.sampleSize; i++) {
          seen.add(Math.floor(Math.random() * n) % trueM)
        }
        sumEstimate += (seen.size / params.sampleSize) * n
      }
      const sampleTime = performance.now() - sampleStart
      const sampleResult = sumEstimate / params.numTrials
      
      results[`n=${n},ratio=${ratio}`] = {
        trueM,
        enumTime,
        enumResult,
        sampleTime: sampleTime / params.numTrials,  // Per-trial time
        sampleResult: Math.round(sampleResult),
        sampleError: Math.abs(sampleResult - trueM) / trueM,
        enumSpeedup: sampleTime / (enumTime * params.numTrials)
      }
    }
  }
  return results
}
```

**Expected Outcome**:
- Enumeration faster than sampling for $n < 5000$
- Sampling error acceptable (< 15%) for $n > 5000$
- Clear crossover point where sampling becomes preferred

**What Would Falsify**:
- Enumeration still faster at $n = 50000$
- Sampling error unacceptable (> 30%) at threshold boundary

---

### Simulation 6: Edge Cases and Pathological Functions

**Hypothesis**: The estimator handles edge cases gracefully.

**Test Cases**:

| Case | Function | Expected |
|------|----------|----------|
| Constant | $f(x) = 42$ | $m = 1$ |
| Identity (bijective) | $f(x) = x$ | $m = n$ |
| Binary | $f(x) = x \% 2$ | $m = 2$ |
| Near-bijective | $f(x) = x$ except $f(0) = f(1) = 0$ | $m = n - 1$ |
| Highly collapsing | $f(x) = x \% \sqrt{n}$ | $m = \sqrt{n}$ |

**Algorithm**:
```typescript
function validateEdgeCases(): EdgeCaseResults {
  const n = 10000
  const k = 1000
  const numTrials = 10000
  
  const cases = [
    { name: 'constant', fn: () => 42, trueM: 1 },
    { name: 'identity', fn: (x: number) => x, trueM: n },
    { name: 'binary', fn: (x: number) => x % 2, trueM: 2 },
    { name: 'near-bijective', fn: (x: number) => x === 1 ? 0 : x, trueM: n - 1 },
    { name: 'sqrt-collapse', fn: (x: number) => x % Math.floor(Math.sqrt(n)), trueM: Math.floor(Math.sqrt(n)) },
  ]
  
  return cases.map(({ name, fn, trueM }) => {
    let sumEstimate = 0
    let minD = Infinity, maxD = -Infinity
    
    for (let trial = 0; trial < numTrials; trial++) {
      const seen = new Set<number>()
      for (let i = 0; i < k; i++) {
        const x = Math.floor(Math.random() * n)
        seen.add(fn(x))
      }
      const d = seen.size
      minD = Math.min(minD, d)
      maxD = Math.max(maxD, d)
      sumEstimate += (d / k) * n
    }
    
    return {
      name,
      trueM,
      meanEstimate: Math.round(sumEstimate / numTrials),
      dRange: [minD, maxD],
      relativeError: Math.abs((sumEstimate / numTrials) - trueM) / trueM,
      // For constant/binary, d should always equal trueM
      dAlwaysCorrect: minD === trueM && maxD === trueM
    }
  })
}
```

**Expected Outcome**:
- Constant: Always exact ($d = 1$)
- Binary: Always exact ($d = 2$)
- Identity: High variance, will **substantially underestimate** $n$ because we're measuring "fraction of domain touched by $k$ samples". With $k = 1000$ and $n = 10000$, we expect $d \approx 632$ (birthday collision effect), giving estimate $\approx 632/1000 \cdot 10000 = 6320$. This is acceptable: for near-bijective functions, the estimator provides a **lower bound-ish view** of codomain size.
- Near-bijective: Similar underestimation as identity
- Sqrt-collapse: Moderate accuracy

**What Would Falsify**:
- Constant/binary returning $d \neq$ true value
- Catastrophic failures (estimate off by orders of magnitude)

> **Note:** The identity case demonstrates a fundamental limitation: for very large codomains ($m \approx n$), the fraction estimator underestimates because sampling without replacement from the codomain isn't the same as sampling from a population of size $m$. This is acceptable for our use case — a `size()` hint that says "at least this many" is still useful.

#### Identity Case Analysis: Why ~5% Error is Acceptable

For the identity function with $n = 10,000$ and $k = 1,000$:

**The Math:**
- Expected distinct samples: $d \approx n(1 - (1 - 1/n)^k) \approx n(1 - e^{-k/n}) = 10000(1 - e^{-0.1}) \approx 951$
- Fraction estimate: $\hat{m} = (951/1000) \cdot 10000 = 9510$
- True value: $m = 10000$
- Error: $(10000 - 9510) / 10000 = 4.9\%$

**The Verdict:** This ~5% error is acceptable. A PBT library uses `size()` to answer questions like:
- "Is this set small enough to exhaustively enumerate?" (9.5k vs 10k → same answer: no)
- "How hard should I try to find unique values?" (both suggest "many values available")

**Do not over-engineer a fix for this in v1.** The underestimation is a fundamental property of sampling from large domains, and correcting it would require either:
1. Much larger sample sizes (expensive), or
2. Birthday-paradox inversion (unstable for large $m$)

Neither is worth the complexity for a heuristic `size()` hint.

---

### Simulation 7: Chained Map Composition

**Hypothesis**: Size estimation composes correctly for chained maps.

**Validates**: Composition Semantics (Section: Composition Semantics)

**Algorithm**:
```typescript
function validateChainedMaps(): ChainedMapResults {
  const n = 10000
  const k = 1000
  const numTrials = 5000
  
  // Chain: int(0, n-1).map(x => x % 100).map(x => x % 10)
  // True sizes: n -> 100 -> 10
  
  const f1 = (x: number) => x % 100
  const f2 = (x: number) => x % 10
  const composed = (x: number) => f2(f1(x))
  
  let sumDirect = 0, sumChained = 0
  
  for (let trial = 0; trial < numTrials; trial++) {
    // Direct estimate of composed function
    const seenDirect = new Set<number>()
    for (let i = 0; i < k; i++) {
      seenDirect.add(composed(Math.floor(Math.random() * n)))
    }
    sumDirect += (seenDirect.size / k) * n
    
    // Chained estimate: first estimate |C_f1|, then estimate |C_f2| relative to that
    // This simulates what happens when we have arb.map(f1).map(f2)
    const seenF1 = new Set<number>()
    for (let i = 0; i < k; i++) {
      seenF1.add(f1(Math.floor(Math.random() * n)))
    }
    const estimateC1 = (seenF1.size / k) * n
    
    // Now sample from C_f1 (we use uniform from [0, 100) as proxy)
    const seenF2 = new Set<number>()
    for (let i = 0; i < k; i++) {
      seenF2.add(f2(Math.floor(Math.random() * 100)))
    }
    const estimateC2 = (seenF2.size / k) * estimateC1
    sumChained += estimateC2
  }
  
  return {
    trueComposedSize: 10,
    directEstimate: Math.round(sumDirect / numTrials),
    chainedEstimate: Math.round(sumChained / numTrials),
    directError: Math.abs((sumDirect / numTrials) - 10) / 10,
    chainedError: Math.abs((sumChained / numTrials) - 10) / 10
  }
}
```

**Expected Outcome**:
- Direct composition estimate should be reasonably accurate
- Chained estimation may have higher variance due to error propagation
- Both should converge to same value for large $k$

**What Would Falsify**:
- Direct and chained estimates diverging significantly
- Either estimate being orders of magnitude off

---

### Simulation 8: Cluster Mapping (Step Functions)

**Hypothesis**: The estimator handles cluster/step functions where large contiguous chunks of the domain map to single codomain values.

**Validates**: Assumption A2 (Uniform Sampling) and robustness to non-smooth mappings

> **Why this matters:** Simulation 3 tests "skewed" (Zipfian) distributions, but not "clustered" mappings where $f$ maps huge chunks of the domain to single values. This tests whether sampling is truly uniform across the domain. If the base arbitrary has a biased generator (e.g., `fc.integer` favors 0, min, max), and our estimator assumes uniform sampling, we might vastly skew the estimate.

**Setup**:
```typescript
interface ClusterMappingParams {
  domainSize: number           // e.g., 10000
  clusterSizes: number[]       // e.g., [10, 100, 1000] (size of each step)
  sampleSize: number           // e.g., 1000
  numTrials: number            // e.g., 10000
}
```

**Test Cases**:

| Case | Function | Expected $m$ |
|------|----------|--------------|
| Fine clusters | $f(x) = \lfloor x / 10 \rfloor$ | $\lceil n / 10 \rceil = 1000$ |
| Medium clusters | $f(x) = \lfloor x / 100 \rfloor$ | $\lceil n / 100 \rceil = 100$ |
| Coarse clusters | $f(x) = \lfloor x / 1000 \rfloor$ | $\lceil n / 1000 \rceil = 10$ |

**Algorithm**:
```typescript
function validateClusterMapping(params: ClusterMappingParams): ClusterResults {
  const results: ClusterResults = {}
  const { domainSize: n, sampleSize: k } = params
  
  for (const clusterSize of params.clusterSizes) {
    const trueM = Math.ceil(n / clusterSize)
    const stepFn = (x: number) => Math.floor(x / clusterSize)
    
    let sumEstimate = 0
    let sumSquaredError = 0
    
    for (let trial = 0; trial < params.numTrials; trial++) {
      // Simulate UNIFORM sampling (critical!)
      const seen = new Set<number>()
      for (let i = 0; i < k; i++) {
        const x = Math.floor(Math.random() * n)  // Truly uniform
        seen.add(stepFn(x))
      }
      const d = seen.size
      const estimate = (d / k) * n
      
      sumEstimate += estimate
      sumSquaredError += (estimate - trueM) ** 2
    }
    
    results[`cluster=${clusterSize}`] = {
      trueM,
      clusterSize,
      meanEstimate: Math.round(sumEstimate / params.numTrials),
      rmse: Math.sqrt(sumSquaredError / params.numTrials),
      relativeError: Math.abs((sumEstimate / params.numTrials) - trueM) / trueM
    }
  }
  
  return results
}

// Additional test: compare uniform vs biased sampling
function validateUniformVsBiased(params: ClusterMappingParams): BiasComparisonResults {
  const n = params.domainSize
  const k = params.sampleSize
  const clusterSize = 1000  // Coarse clustering
  const trueM = Math.ceil(n / clusterSize)
  const stepFn = (x: number) => Math.floor(x / clusterSize)
  
  let uniformSum = 0, biasedSum = 0
  
  for (let trial = 0; trial < params.numTrials; trial++) {
    // Uniform sampling
    const seenUniform = new Set<number>()
    for (let i = 0; i < k; i++) {
      seenUniform.add(stepFn(Math.floor(Math.random() * n)))
    }
    uniformSum += (seenUniform.size / k) * n
    
    // Biased sampling (simulates PBT edge-case bias)
    // 30% of samples from edges (0, n-1), 70% uniform
    const seenBiased = new Set<number>()
    for (let i = 0; i < k; i++) {
      let x: number
      if (Math.random() < 0.3) {
        x = Math.random() < 0.5 ? 0 : n - 1  // Edge bias
      } else {
        x = Math.floor(Math.random() * n)
      }
      seenBiased.add(stepFn(x))
    }
    biasedSum += (seenBiased.size / k) * n
  }
  
  return {
    trueM,
    uniformEstimate: Math.round(uniformSum / params.numTrials),
    biasedEstimate: Math.round(biasedSum / params.numTrials),
    uniformError: Math.abs((uniformSum / params.numTrials) - trueM) / trueM,
    biasedError: Math.abs((biasedSum / params.numTrials) - trueM) / trueM
  }
}
```

**Expected Outcome**:
- Uniform sampling should produce accurate estimates for all cluster sizes
- Biased sampling should show measurable degradation, especially for coarse clusters
- The bias test validates the critical importance of `sampleUniform()` over standard `sample()`

**What Would Falsify**:
- Uniform sampling producing > 30% error for cluster mappings
- Biased and uniform sampling producing similar results (would suggest bias doesn't matter)

---

### Summary: Simulation Test Matrix

> **Reminder:** Pass criteria are for "good enough as a `size()` hint", not statistical optimality.

| Simulation | Validates | Key Metric | Pass Criterion |
|------------|-----------|------------|----------------|
| 1. Fraction Estimator | A4 | Bias, RMSE, Coverage | < 20% relative error for 0.1–0.9 ratios; CI coverage ≥ 80% |
| 2. Sample Size | A5 | Accuracy rate | > 70% within 20% error at $k = 20\sqrt{n}$ |
| 3. Balanced vs Unbalanced | A4 robustness | Degradation rate | Graceful degradation; no catastrophic failures |
| 4. Birthday Comparison | Design decision | RMSE comparison | Fraction ≤ Birthday in ≥ 60% of cases |
| 5. Enumeration Threshold | Configuration | Time/accuracy trade-off | Identifiable crossover point exists |
| 6. Edge Cases | Boundary behavior | Correct d values | Constants/binary exact; no order-of-magnitude errors |
| 7. Chained Maps | Composition | Error propagation | Both estimates within 2x of true value |
| 8. Cluster Mapping | A2 (Uniform Sampling) | Uniform vs biased accuracy | Uniform < 20% error; biased shows measurable degradation |

### Running the Simulations

Create `test/simulations/mapped-arbitrary-validation.ts` with:

1. Configurable parameters for all simulations
2. Summary statistics and pass/fail criteria
3. Optional CSV output for further analysis

**Recommended Default Parameters**:
```typescript
const DEFAULT_PARAMS = {
  domainSizes: [100, 1000, 10000, 100000],
  codomainRatios: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99],
  sampleSizes: [50, 100, 200, 500, 1000, 2000],
  numTrials: 10000,
  targetAccuracy: 0.10  // 10% relative error
}
```

**Monte Carlo Error**: With 10,000 trials, the standard error for a proportion estimate is approximately $\sqrt{p(1-p)/10000} \approx 0.005$ at $p = 0.5$. This means coverage estimates will have ±1% uncertainty (95% CI).

---

## References

- Flajolet, P., & Martin, G. N. (1985). Probabilistic counting algorithms for data base applications
- Heule, S., Nunkesser, M., & Hall, A. (2013). HyperLogLog in practice
- Charikar, M., Chen, K., & Farach-Colton, M. (2002). Finding frequent items in data streams
- Bar-Yossef, Z., et al. (2002). Counting distinct elements in a data stream
