# Change: Research Statistical Ergonomics and Confidence-Based Testing

> **GitHub Issue:** [#413](https://github.com/fluent-check/fluent-check/issues/413)

## Why

FluentCheck has sophisticated statistical foundations (Beta and Beta-Binomial distributions, Bayesian size estimation for filtered arbitraries) but these capabilities are not exposed to users in a meaningful way. Currently:

1. **No statistical feedback**: `FluentResult` only returns `satisfiable`, `example`, and `seed` - users have no visibility into confidence levels, test coverage distribution, or statistical quality
2. **Fixed termination**: Tests run a fixed number of iterations (default 1000) regardless of whether sufficient confidence has been achieved
3. **No coverage analysis**: Users cannot label, classify, or measure coverage of generated test cases
4. **No confidence thresholds**: Users cannot specify "run until 99% confident" or similar statistical stopping criteria
5. **No distribution insights**: No way to verify that generated inputs adequately cover the input space

This research proposal investigates how to make fluent-check's statistical machinery accessible and ergonomic for users who need quantifiable confidence in their property-based tests.

## Research Areas

### 1. Confidence-Based Termination Criteria

**Problem**: Users currently specify `sampleSize` but have no way to specify desired confidence levels.

**Research Questions**:
- How should Bayesian posterior probability be calculated for property satisfaction?
- What prior distribution assumptions are appropriate (uniform, weakly informative)?
- How does confidence-based stopping interact with shrinking?
- What is the API ergonomics for specifying confidence vs. sample size?

**Inspiration**: Sequential testing theory, adaptive sampling, Bayesian stopping rules.

**Potential API**:
```typescript
fc.scenario()
  .config(fc.strategy().withConfidence(0.99))  // Run until 99% confident
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

### 2. Test Case Classification and Labeling

**Problem**: Users cannot track what kinds of inputs were tested, making it hard to assess test quality.

**Research Questions**:
- What labeling API provides the best balance of power and simplicity?
- How should labels be aggregated and reported?
- Should labeling be built into arbitraries or added at assertion time?

**Inspiration**: QuickCheck's `label`, `classify`, `collect`, `tabulate`.

**Potential API**:
```typescript
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 5, 'small')
  .classify(({xs}) => xs.length >= 5, 'large')
  .then(({xs}) => reverse(reverse(xs)).equals(xs))
  .check()

// Result includes: { labels: { empty: 15, small: 423, large: 562 } }
```

### 3. Coverage Requirements and Verification

**Problem**: Users cannot enforce that certain categories of inputs are adequately tested.

**Research Questions**:
- How should coverage requirements be specified?
- How should statistical verification of coverage work (confidence intervals vs. exact)?
- What happens when coverage requirements cannot be met?

**Inspiration**: QuickCheck's `cover`, `checkCoverage`, `coverTable`.

**Potential API**:
```typescript
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(5, ({x}) => x < 0, 'negative')     // At least 5% negative
  .cover(5, ({x}) => x > 0, 'positive')     // At least 5% positive  
  .cover(1, ({x}) => x === 0, 'zero')       // At least 1% zero
  .then(({x}) => Math.abs(x) >= 0)
  .checkCoverage()  // Fails if coverage requirements not met with statistical confidence
```

### 4. Enhanced Result Statistics

**Problem**: `FluentResult` provides minimal information about the test run.

**Research Questions**:
- What statistics are most valuable for users?
- How should statistics be structured for both human consumption and programmatic use?
- How do statistics interact with reproducibility (seeds)?

**Proposed Result Extension**:
```typescript
interface FluentStatistics {
  // Execution metrics
  testsRun: number
  testsDiscarded: number  // Filtered out by preconditions
  executionTimeMs: number
  
  // Confidence metrics
  confidence: number              // Posterior probability property holds
  credibleInterval: [number, number]  // e.g., 95% credible interval for success rate
  
  // Coverage metrics
  labels: Record<string, number>  // Label counts
  coverageChecks: CoverageResult[] // Coverage requirement results
  
  // Distribution metrics
  arbitraryStats: Record<string, ArbitraryStatistics>
}

interface ArbitraryStatistics {
  samplesGenerated: number
  uniqueValues: number
  cornerCasesTested: number
  distributionSummary: {
    min?: number | string
    max?: number | string
    mean?: number
    median?: number
    percentiles?: Record<string, number>
  }
}

interface FluentResult<Rec> {
  satisfiable: boolean
  example: Rec
  seed: number
  statistics: FluentStatistics  // NEW
}
```

### 5. Arbitrary Coverage Analysis

**Problem**: No visibility into whether arbitraries adequately covered their domains.

**Research Questions**:
- How should coverage be measured for different arbitrary types (bounded vs. unbounded)?
- How should corner case coverage be tracked and reported?
- What visualization or reporting is most useful?

**Potential API**:
```typescript
const result = fc.scenario()
  .forall('x', fc.integer(1, 100))
  .then(({x}) => isPrime(x) || !isPrime(x))
  .check()

// result.statistics.arbitraryStats.x:
// {
//   samplesGenerated: 1000,
//   uniqueValues: 847,
//   cornerCasesTested: 2,  // tested 1 and 100
//   distributionSummary: { min: 1, max: 100, mean: 50.3, median: 51 }
// }
```

### 6. Statistical Reporting API

**Problem**: FluentReporter only shows counterexamples, no statistical context.

**Research Questions**:
- How should statistics be formatted for test framework output?
- Should verbose vs. concise modes exist?
- How should failing coverage requirements be reported?

**Potential API**:
```typescript
// Concise output (default)
fc.expect(result)  // Only throws on failure, includes stats in error

// Verbose output
fc.expect(result, { verbose: true })  // Always logs statistics

// Programmatic access
const stats = result.statistics
console.log(`Confidence: ${(stats.confidence * 100).toFixed(2)}%`)
console.log(`Tests run: ${stats.testsRun}`)
```

### 7. Adaptive Strategies

**Problem**: Current strategies don't adapt based on intermediate results.

**Research Questions**:
- Should sampling strategy change based on observed label distribution?
- How should adaptive sampling interact with confidence-based stopping?
- What's the performance overhead of tracking statistics during test execution?

**Potential Features**:
- `withAdaptiveSampling()` - adjust sampling based on coverage gaps
- `withTargetedShrinking()` - use statistics to guide shrinking
- `withEarlyStopping()` - stop early if failure rate exceeds threshold

## Impact

- **Affected specs**: `statistics`, `reporting`, `strategies`, `fluent-api`
- **Affected code**: `FluentResult`, `FluentStrategy`, `FluentReporter`, possibly new files
- **Breaking changes**: Potentially adding fields to `FluentResult` (additive, not breaking)
- **Dependencies**: May need additional statistical functions beyond current jstat usage

## Research Outputs

1. **Framework comparison document**: How QuickCheck, Hypothesis, fast-check, and JSVerify handle statistical features
2. **API design document**: Proposed APIs with trade-offs analysis
3. **Implementation roadmap**: Phased approach to adding statistical features
4. **Benchmark analysis**: Performance impact of statistics collection

## Success Criteria

- Clear documentation of proposed statistical APIs
- Type-safe API designs that integrate with existing fluent chain
- Performance analysis showing acceptable overhead (<10% for basic statistics)
- Compatibility plan with existing code

## Related Work

- QuickCheck (Haskell): Gold standard for PBT statistics (`label`, `classify`, `cover`, `checkCoverage`)
- Hypothesis (Python): Health checks, statistics phases, adaptive testing
- fast-check (JavaScript): Basic statistics, example-based counterexamples
- Academic: Bayesian stopping rules, sequential testing, adaptive sampling
