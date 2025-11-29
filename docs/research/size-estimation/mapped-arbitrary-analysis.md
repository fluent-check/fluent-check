# Mathematical Analysis: Mapped Arbitrary Size Estimation

> **Related Issue:** [#8](https://github.com/fluent-check/fluent-check/issues/8) - Provide accurate codomain size estimation in non-bijective mapped Arbitraries

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

## Mathematical Framework

### Definitions

Let:
- $D$ = domain of base arbitrary with $|D| = n$
- $f: D \to C$ = mapping function  
- $C$ = codomain (image of $f$)
- $|C|$ = cardinality we want to estimate

**Key constraint:** $|C| \leq |D|$ always (surjectivity bound)

### The Count-Distinct Problem

This is the **cardinality estimation** or **count-distinct** problem from database/streaming literature.

Given a stream of $n$ elements from domain $D$, estimate the number of distinct elements.

## Estimation Approaches

### Approach 1: Exact Counting (Small Domains)

When $|D|$ is small (e.g., $|D| \leq 10,000$), enumerate and count:

```typescript
function exactCodomain<A, B>(arb: Arbitrary<A>, f: (a: A) => B): number {
  const seen = new Set<string>()
  for (const value of arb.enumerate()) {
    seen.add(JSON.stringify(f(value)))
  }
  return seen.size
}
```

**Complexity:** $O(n)$ time, $O(|C|)$ space

**When to use:** When `baseArbitrary.size().type === 'exact'` and value is small.

### Approach 2: Sampling-Based Estimation

For large domains, sample $k$ values and estimate.

#### Birthday Paradox Estimator

If we sample $k$ values and observe $d$ distinct values, estimate:

$$\hat{n} = \frac{k^2}{2(k - d)}$$

This is derived from the birthday problem: probability of collision after $k$ samples from population $n$ is approximately $1 - e^{-k^2/2n}$.

**Confidence interval:** Use bootstrap or asymptotic variance.

#### Good-Turing Estimator

Based on frequency of frequencies. If $f_i$ = count of values appearing exactly $i$ times:

$$\hat{n} = d + \frac{f_1^2}{2f_2}$$

where $d$ = observed distinct count, $f_1$ = singletons, $f_2$ = doubletons.

### Approach 3: HyperLogLog (Streaming)

For very large domains where we can't store all samples.

**Algorithm:**
1. Hash each value to uniform $[0, 1)$
2. Track maximum number of leading zeros seen
3. Estimate: $\hat{n} \approx 2^{\max\_zeros}$

**HyperLogLog improvement:** Use $m$ buckets, take harmonic mean.

$$\hat{n} = \frac{\alpha_m \cdot m^2}{\sum_{j=1}^{m} 2^{-M_j}}$$

where $M_j$ = max leading zeros in bucket $j$, $\alpha_m$ = bias correction constant.

**Properties:**
- Space: $O(\log \log n)$ bits per bucket
- Accuracy: $\pm 2\%$ standard error with 1KB memory
- Mergeable: can combine estimates from parallel streams

### Approach 4: Bayesian Estimation

Model the problem probabilistically.

**Prior:** Uniform over possible codomain sizes $|C| \in \{1, 2, ..., |D|\}$

**Likelihood:** Probability of observing $d$ distinct values in $k$ samples given true cardinality $n$:

$$P(d | n, k) = \frac{n!}{(n-d)!} \cdot S(k, d) / n^k$$

where $S(k, d)$ = Stirling number of the second kind.

**Posterior:** $P(n | d, k) \propto P(d | n, k) \cdot P(n)$

This gives a full distribution over possible cardinalities, not just a point estimate.

## Recommended Implementation

```typescript
interface CodomainEstimate {
  type: 'exact' | 'estimated'
  value: number
  credibleInterval?: [number, number]
  method: 'enumeration' | 'sampling' | 'hyperloglog'
}

class MappedArbitrary<A, B> extends Arbitrary<B> {
  size(): CodomainEstimate {
    const baseSize = this.baseArbitrary.size()
    
    // Case 1: Small exact domain - enumerate
    if (baseSize.type === 'exact' && baseSize.value <= ENUMERATION_THRESHOLD) {
      return {
        type: 'exact',
        value: this.countExactCodomain(),
        method: 'enumeration'
      }
    }
    
    // Case 2: Large domain - use sampling
    const samples = this.sampleDistinct(SAMPLE_SIZE)
    const estimate = this.birthdayEstimate(samples)
    
    return {
      type: 'estimated',
      value: Math.min(estimate.value, baseSize.value), // Apply surjectivity bound
      credibleInterval: [
        estimate.lower,
        Math.min(estimate.upper, baseSize.value)
      ],
      method: 'sampling'
    }
  }
}
```

## Open Questions

1. **Threshold selection:** What value of `ENUMERATION_THRESHOLD` balances accuracy vs. performance?

2. **Sample size:** How many samples needed for desired confidence level?
   - Rule of thumb: $k \approx 20\sqrt{n}$ for 5% relative error

3. **Caching:** Should codomain size be computed lazily and cached?

4. **Composition:** How do estimates compose for `arb.map(f).map(g)`?
   - Conservative: $|C_{f \circ g}| \leq \min(|C_f|, |C_g|, |D|)$

5. **Known functions:** Can we detect common patterns?
   - `x => x % k` → codomain ≤ k
   - `x => Math.abs(x)` → codomain ≈ domain/2 (for symmetric ranges)
   - `x => Math.floor(x / k)` → codomain ≈ domain/k

## References

- Flajolet, P., & Martin, G. N. (1985). Probabilistic counting algorithms for data base applications
- Heule, S., Nunkesser, M., & Hall, A. (2013). HyperLogLog in practice
- Charikar, M., Chen, K., & Farach-Colton, M. (2002). Finding frequent items in data streams

## Next Steps

- [ ] Implement enumeration for small domains
- [ ] Implement birthday paradox estimator for large domains
- [ ] Benchmark accuracy vs. sample size
- [ ] Consider HyperLogLog for streaming scenarios
- [ ] Add function pattern detection for common cases
