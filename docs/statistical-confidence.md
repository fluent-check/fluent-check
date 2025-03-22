# Statistical Confidence Calculation

FluentCheck integrates sophisticated statistical methods to quantify the confidence level in test results, going beyond simple pass/fail outcomes common in other testing frameworks.

## Design Philosophy

Property-based testing involves sampling from potentially enormous input spaces. Without statistical rigor, it's difficult to know how much confidence to place in test results. FluentCheck addresses this by:

1. Providing statistical models to quantify confidence in test results
2. Supporting distributions for realistic sampling of complex domains
3. Allowing users to specify required confidence levels

## Implementation Details

FluentCheck implements various probability distributions to model test outcomes and calculate confidence levels. The code is based on sound statistical principles, with well-tested distribution implementations:

```typescript
export abstract class Distribution {
  abstract mean(): number
  abstract mode(): number
  abstract pdf(x: number): number   // Probability density function
  abstract cdf(x: number): number   // Cumulative distribution function
  abstract inv(p: number): number   // Inverse cumulative distribution function
}

export class BetaDistribution extends Distribution {
  constructor(public alpha: number, public beta: number) {
    super()
  }
  // Implementation of beta distribution methods
}

export class BetaBinomialDistribution extends IntegerDistribution {
  constructor(public trials: number, public alpha: number, public beta: number) { super() }
  // Implementation of beta-binomial distribution methods
}
```

The tests verify that these distributions match their mathematical definitions:

```typescript
// From statistics.test.ts
it('defines the mean as a constant-time closed form expression', () => {
  const check = (trials: number, a: number, b: number, expected: number) =>
    expect(new BetaBinomialDistribution(trials, a, b).mean()).to.be.closeTo(expected, deltaFor(expected))

  check(1234, 4.5, 3.5, 694.125)
  check(31234, 1.0, 1.0, 15617.0)
  // More test cases...
})

it('defines a PDF consistent with its mean definition', () => {
  [...Array(100)].forEach((_, n) => {
    const dist = new BetaBinomialDistribution(n, Math.random() * 20, Math.random() * 20)
    const pdfMean = [...Array(n + 1)].reduce((acc, _, i) => acc + dist.pdf(i) * i, 0)
    expect(pdfMean).to.be.closeTo(dist.mean(), deltaFor(dist.mean()))
  })
})
```

These distributions are used to model the posterior probability of property satisfaction after observing test outcomes:

- The **Beta distribution** is used to model continuous probabilities between 0 and 1
- The **Beta-Binomial distribution** is used for discrete trials with uncertainty

The framework leverages these distributions to estimate:

1. The probability that a property holds for all inputs
2. The size of the input space that satisfies a property
3. The confidence level in the test results

## Arbitrary Size Estimation

One application of statistical methods in FluentCheck is estimating the size of arbitrary domains, especially after filtering:

```typescript
// From arbitrary.test.ts
it('size should be estimated for filtered arbitraries', () => {
  expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval[0])
    .to.be.below(600)
  expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval[1])
    .to.be.above(600)
  expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval[0])
    .to.be.below(600)
  expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval[1])
    .to.be.above(600)
})
```

For filtered arbitraries, the exact size is unknown, so FluentCheck uses statistical sampling to estimate a credible interval for the size.

## Design Decisions for Arbitrary Size Estimation

The accurate estimation of arbitrary sizes is essential for early stopping, exploration metrics, and confidence levels in assertions. We've implemented sophisticated size estimation across various arbitrary types:

### MappedArbitrary

For mapped arbitraries, size estimation depends on whether the mapping function is bijective (one-to-one) or not:

```typescript
size(): ArbitrarySize {
  const baseSize = this.baseArbitrary.size()
  
  // For small base arbitraries, we compute the exact mapped size
  if (baseSize.value <= 1000 && baseSize.type === 'exact') {
    const mappedValues = new Set<string>()
    // Generate all values and count distinct mapped values
    for (const pick of picks) {
      mappedValues.add(stringify(this.f(pick.value)))
    }
    
    // If we found fewer distinct values than the base size, it's a non-bijective mapping
    if (mappedValues.size < baseSize.value) {
      return {
        type: 'estimated',
        value: mappedValues.size,
        credibleInterval: [mappedValues.size, mappedValues.size]
      }
    }
    // Otherwise, it's a bijective mapping
    return {
      type: 'exact',
      value: mappedValues.size,
      credibleInterval: [mappedValues.size, mappedValues.size]
    }
  }
}
```

For large domains where complete enumeration is impractical, we use sampling to estimate the cardinality:

```typescript
// Sample from base arbitrary
const baseSample = this.baseArbitrary.sample(sampleSize)
const mappedValues = new Set<string>()

for (const pick of baseSample) {
  mappedValues.add(stringify(this.f(pick.value)))
}

// Estimate the proportion of distinct values
const distinctRatio = mappedValues.size / baseSample.length
const estimatedSize = Math.round(baseSize.value * distinctRatio)
```

### FilteredArbitrary

For filtered arbitraries, we combine Bayesian statistics with adaptive sampling:

1. **Initial Sampling**: We use an adaptive sampling approach to get a preliminary estimate:

```typescript
// Sample a small number of values to initialize our estimate
const sampleSize = Math.min(30, this.baseArbitrary.size().value);
const samples = this.baseArbitrary.sample(sampleSize, generator);

for (const pick of samples) {
  if (this.f(pick.value)) {
    this.acceptCount++;
  } else {
    this.rejectCount++;
  }
}
```

2. **Beta-Binomial for Discrete Domains**: For integer domains with exact sizes, we use a beta-binomial distribution for more accurate interval estimation:

```typescript
// Use beta-binomial for more accurate interval estimation
const bbDist = new BetaBinomialDistribution(
  baseSize.value,
  this.acceptCount + 1,  // +1 for prior
  this.rejectCount + 1   // +1 for prior
);

return {
  type: 'estimated',
  value: Math.round(bbDist.mean()),
  credibleInterval: [
    bbDist.inv(lowerCredibleInterval),
    bbDist.inv(upperCredibleInterval)
  ]
};
```

3. **Continuous Estimation**: For continuous or very large domains, we use the beta distribution:

```typescript
return mapArbitrarySize(baseSize, v => ({
  type: 'estimated',
  value: Math.round(v * this.sizeEstimation.mean()),
  credibleInterval: [
    Math.ceil(v * this.sizeEstimation.inv(lowerCredibleInterval)),
    Math.floor(v * this.sizeEstimation.inv(upperCredibleInterval))
  ]
}))
```

### UniqueArbitrary

For unique arbitraries (sampling without replacement), the theoretical size matches the base arbitrary, but the sampling behavior differs:

```typescript
// The size is the same as the base arbitrary, as uniqueness
// just changes the sampling approach but not the domain size
return this.baseArbitrary.size()
```

The implementation tracks generated values to ensure uniqueness:

```typescript
sample(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
  // Since we're sampling without replacement, we need to take into account 
  // previously generated values
  const result: FluentPick<A>[] = []
  
  while (result.length < sampleSize) {
    const pick = this.pick(generator)
    if (pick === undefined) break // Can't generate any more unique values
    result.push(pick)
  }
  
  return result
}
```

## Practical Applications

Statistical confidence calculations are particularly valuable for:

1. **Critical systems**: Where high confidence in correctness is essential
2. **Massive input spaces**: Where exhaustive testing is impossible
3. **Risk assessment**: Quantifying the probability of failure
4. **Test optimization**: Determining when enough tests have been run

## Usage Examples

```typescript
// Configure the testing strategy with a 99% confidence level
fc.scenario()
  .config(fc.strategy()
    .withMaxIterations(1000)
    .withConfidence(0.99))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

The framework will run tests until it achieves the specified confidence level, or reaches the maximum number of iterations.

## Mathematical Foundation

FluentCheck's statistical approach is based on Bayesian statistics, which allows updating beliefs based on evidence. The implementation uses:

1. **Prior distributions**: Initial assumptions about property satisfaction
2. **Likelihood functions**: The probability of observing test results given a hypothesis
3. **Posterior distributions**: Updated beliefs after observing test results

The `IntegerDistribution` base class provides default implementations of key statistical functions:

```typescript
export abstract class IntegerDistribution extends Distribution {
  abstract supportMin(): number
  abstract supportMax(): number

  // Default implementation is O(n) on the support size
  mean(): number {
    let avg = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      avg += k * this.pdf(k)
    }
    return avg
  }

  // Default implementation is O(n) on the support size
  mode(): number {
    let max = NaN, maxP = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      const p = this.pdf(k)
      if (p > maxP) { max = k; maxP = p }
    }
    return max
  }

  // Default implementation for cdf and inv...
}
```

## Advanced Statistical Features

FluentCheck's statistical toolkit includes:

1. **Confidence intervals**: Estimating the range of possible satisfaction probabilities
2. **Bayesian inference**: Updating beliefs about property satisfaction based on evidence
3. **Statistical power analysis**: Determining the number of tests needed to detect failures with a given probability

## Future Improvements in Statistical Methods

Several enhancements could further improve FluentCheck's statistical capabilities:

### 1. Cardinality Estimation for Massive Sets

For extremely large domains, we could implement more efficient cardinality estimation algorithms:

```typescript
/**
 * HyperLogLog implementation for cardinality estimation with O(1) memory complexity
 * and relative error of approximately 1.04/√m where m is the number of registers
 */
class HyperLogLogEstimator {
  private registers: Uint8Array;
  private readonly m: number;
  private readonly alpha: number;
  
  constructor(p: number) {
    this.m = 1 << p;
    this.registers = new Uint8Array(this.m);
    // Alpha constant based on m
    this.alpha = this.m <= 16 ? 0.673 :
                this.m <= 32 ? 0.697 :
                this.m <= 64 ? 0.709 : 0.7213 / (1 + 1.079 / this.m);
  }
  
  add(value: string): void {
    // Hash the value and count leading zeros
    const hash = this.hashFunction(value);
    const idx = hash & (this.m - 1);
    const w = hash >>> Math.log2(this.m);
    const leadingZeros = this.countLeadingZeros(w) + 1;
    
    this.registers[idx] = Math.max(this.registers[idx], leadingZeros);
  }
  
  cardinality(): number {
    // Compute the harmonic mean and apply corrections
    // for small and large cardinalities
    // ...
  }
}
```

### 2. Adaptive Confidence Levels

Allow for dynamic adjustment of confidence levels based on the criticality of assertions:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withAdaptiveConfidence({
      initial: 0.95,
      forCritical: 0.999,
      forNonCritical: 0.9,
      adaptationRate: 0.01
    }))
  .forall('x', fc.integer())
  .then(({x}) => {
    // Critical assertion
    fc.assert.withConfidence(x * x >= 0, 'critical');
    
    // Non-critical assertion
    fc.assert.withConfidence(x % 2 === 0 || x % 2 === 1, 'nonCritical');
  })
  .check()
```

### 3. Distribution-Aware Sampling

Improve sampling efficiency by leveraging knowledge of the underlying distribution:

```typescript
// For normal distributions, focus sampling on regions around the mean
fc.normalDistribution(0, 1, {
  samplingStrategy: 'adaptive',
  focusRegions: [
    { center: 0, weight: 0.5 },    // Sample heavily around the mean
    { center: 2, weight: 0.25 },   // Sample somewhat around +2 sigma
    { center: -2, weight: 0.25 }   // Sample somewhat around -2 sigma
  ]
})
```

### 4. Markov Chain Monte Carlo Methods

For complex, high-dimensional spaces, implement MCMC methods for more efficient sampling:

```typescript
fc.mcmcSampler({
  initialState: [0, 0, 0],
  proposalDistribution: (current) => {
    // Generate proposal state near current state
    return current.map(x => x + fc.normal(0, 0.1).sample());
  },
  acceptanceProbability: (current, proposed, target) => {
    // Metropolis-Hastings acceptance rule
    return Math.min(1, target(proposed) / target(current));
  },
  burnInPeriod: 1000,
  thinningFactor: 10
})
```

### 5. Sequential Probability Ratio Testing

Implement SPRT for early stopping with rigorous statistical guarantees:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withSequentialTesting({
      alpha: 0.05,  // Type I error rate
      beta: 0.05,   // Type II error rate
      theta0: 0.99, // Null hypothesis: property holds with prob >= 0.99
      theta1: 0.95  // Alternative: property holds with prob <= 0.95
    }))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

These enhancements would further strengthen FluentCheck's statistical foundation, enabling even more powerful and efficient property-based testing across a wider range of domains and constraints.

## Comparison with Other Frameworks

Most property testing frameworks rely on a fixed number of test cases without statistical guarantees. FluentCheck's approach provides quantifiable confidence in test results, making it more suitable for critical applications where reliability is paramount. For instance, while FastCheck might run a fixed 100 tests by default, FluentCheck can adaptively decide how many tests to run based on the desired confidence level and observed results. 