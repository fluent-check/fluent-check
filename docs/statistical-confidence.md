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

## Comparison with Other Frameworks

Most property testing frameworks rely on a fixed number of test cases without statistical guarantees. FluentCheck's approach provides quantifiable confidence in test results, making it more suitable for critical applications where reliability is paramount. For instance, while FastCheck might run a fixed 100 tests by default, FluentCheck can adaptively decide how many tests to run based on the desired confidence level and observed results. 