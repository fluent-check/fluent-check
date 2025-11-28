# Statistical Confidence Calculation

FluentCheck integrates sophisticated statistical methods to quantify the confidence level in test results, going beyond simple pass/fail outcomes common in other testing frameworks.

## Design Philosophy

Property-based testing involves sampling from potentially enormous input spaces. Without statistical rigor, it's difficult to know how much confidence to place in test results. FluentCheck addresses this by:

1. Providing statistical models to quantify confidence in test results
2. Supporting distributions for realistic sampling of complex domains
3. Allowing users to specify required confidence levels

## Implementation Details

FluentCheck implements various probability distributions to model test outcomes and calculate confidence levels. The code is based on sound statistical principles, using the `jstat` library for mathematical functions:

```typescript
import jstat from 'jstat'

/**
 * A probability distribution (https://en.wikipedia.org/wiki/Probability_distribution).
 */
export abstract class Distribution {
  abstract mean(): number
  abstract mode(): number
  abstract pdf(x: number): number   // Probability density function
  abstract cdf(x: number): number   // Cumulative distribution function
  abstract inv(p: number): number   // Inverse cumulative distribution function
}

/**
 * A beta distribution (https://en.wikipedia.org/wiki/Beta_distribution).
 */
export class BetaDistribution extends Distribution {
  constructor(public alpha: number, public beta: number) {
    super()
  }

  mean(): number { return jstat.beta.mean(this.alpha, this.beta) }
  mode(): number { return jstat.beta.mode(this.alpha, this.beta) }
  pdf(x: number): number { return jstat.beta.pdf(x, this.alpha, this.beta) }
  cdf(x: number): number { return jstat.beta.cdf(x, this.alpha, this.beta) }
  inv(x: number): number { return jstat.beta.inv(x, this.alpha, this.beta) }
}

/**
 * A beta-binomial distribution (https://en.wikipedia.org/wiki/Beta-binomial_distribution).
 */
export class BetaBinomialDistribution extends IntegerDistribution {
  constructor(public trials: number, public alpha: number, public beta: number) { super() }

  pdf(x: number): number { return Math.exp(this.logPdf(x)) }
  supportMin(): number { return 0 }
  supportMax(): number { return this.trials }
  mean(): number { return this.trials * this.alpha / (this.alpha + this.beta) }
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
/**
 * A discrete probability distribution where the support is a contiguous set of integers.
 */
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

  // Default implementation is O(n) on the support size. Can be made better if distribution is
  // known to be unimodal
  mode(): number {
    let max = NaN, maxP = 0
    for (let k = this.supportMin(); k <= this.supportMax(); k++) {
      const p = this.pdf(k)
      if (p > maxP) { max = k; maxP = p }
    }
    return max
  }

  // Default implementation is O(n * pdf), where `pdf` is the time complexity of pdf(k)
  cdf(k: number): number {
    if (k < this.supportMin()) return 0.0
    if (k >= this.supportMax()) return 1.0
    let sum = 0
    for (let k2 = this.supportMin(); k2 <= k; k2++) {
      sum += this.pdf(k2)
    }
    return sum
  }

  // Default implementation is O(log(n) * cdf), where `cdf` is the time complexity of cdf(k)
  inv(p: number): number {
    let low = this.supportMin(), high = this.supportMax()
    while (low < high) {
      const mid = Math.floor((high + low) / 2)
      if (this.cdf(mid) >= p) high = mid
      else low = mid + 1
    }
    return low
  }
}
```

## Advanced Statistical Features

FluentCheck's statistical toolkit includes:

1. **Confidence intervals**: Estimating the range of possible satisfaction probabilities
2. **Bayesian inference**: Updating beliefs about property satisfaction based on evidence
3. **Statistical power analysis**: Determining the number of tests needed to detect failures with a given probability

## Comparison with Other Frameworks

Most property testing frameworks rely on a fixed number of test cases without statistical guarantees. FluentCheck's approach provides quantifiable confidence in test results, making it more suitable for critical applications where reliability is paramount. For instance, while FastCheck might run a fixed 100 tests by default, FluentCheck can adaptively decide how many tests to run based on the desired confidence level and observed results.

## Roadmap: Enhanced Statistical Features

A comprehensive research effort has been conducted to design enhanced statistical ergonomics for FluentCheck. The planned features include:

### Test Case Classification

```typescript
// Future API: Label and classify test cases
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 5, 'small')
  .classify(({xs}) => xs.length >= 5, 'large')
  .then(({xs}) => xs.sort().length === xs.length)
  .check()
// result.statistics.labels = { empty: 152, small: 423, large: 425 }
```

### Coverage Requirements

```typescript
// Future API: Verify coverage with statistical confidence
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(10, ({x}) => x < 0, 'negative')
  .cover(10, ({x}) => x > 0, 'positive')
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()  // Fails if coverage requirements not met
```

### Confidence-Based Termination

```typescript
// Future API: Run until specified confidence achieved
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)
// result.statistics.confidence = 0.9992
// result.statistics.testsRun = 6905 (variable based on confidence achieved)
```

### Enhanced Statistics in Results

```typescript
// Future API: Comprehensive statistics in result
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

console.log(result.statistics.testsRun)        // 1000
console.log(result.statistics.executionTimeMs) // 45
console.log(result.statistics.confidence)      // 0.997
console.log(result.statistics.credibleInterval) // [0.995, 1.0]
```

For detailed research findings, API designs, and implementation plans, see:
- [Research: Statistical Ergonomics](research/statistical-ergonomics/README.md)