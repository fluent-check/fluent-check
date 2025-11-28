# API Design: Statistical Ergonomics for FluentCheck

This document specifies the proposed APIs for statistical features in FluentCheck, including type definitions, method signatures, and usage examples.

## Design Principles

1. **Fluent Integration**: All APIs integrate naturally with the existing fluent chain
2. **Type Safety**: Full TypeScript type inference with no explicit generics required
3. **Backwards Compatibility**: Existing code continues to work without modification
4. **Progressive Disclosure**: Basic usage is simple; advanced features are opt-in
5. **Composability**: Statistical features compose with existing arbitraries and assertions

## 1. Enhanced FluentResult and Statistics

### FluentStatistics Interface

```typescript
/**
 * Statistics collected during test execution.
 * Basic statistics are always collected; detailed statistics are opt-in.
 */
interface FluentStatistics {
  // === Basic Statistics (always collected) ===
  
  /** Total number of test cases executed */
  testsRun: number
  
  /** Number of test cases that passed the property */
  testsPassed: number
  
  /** Number of test cases discarded due to preconditions/filters */
  testsDiscarded: number
  
  /** Total execution time in milliseconds */
  executionTimeMs: number
  
  // === Confidence Statistics (calculated when requested) ===
  
  /**
   * Bayesian posterior probability that the property holds for all inputs.
   * Undefined if not calculated (e.g., if test failed immediately).
   */
  confidence?: number
  
  /**
   * Credible interval for the success rate (default 95%).
   * [lower, upper] bounds on the true success probability.
   */
  credibleInterval?: [number, number]
  
  // === Label Statistics (when classify/label/collect used) ===
  
  /**
   * Map of label names to counts.
   * Only populated when classify(), label(), or collect() are used.
   */
  labels?: Record<string, number>
  
  /**
   * Label percentages (convenience accessor).
   * Each value is the percentage of total tests with that label.
   */
  labelPercentages?: Record<string, number>
  
  // === Coverage Statistics (when cover() used) ===
  
  /**
   * Results of coverage requirement checks.
   * Only populated when cover() is used.
   */
  coverageResults?: CoverageResult[]
  
  // === Detailed Statistics (opt-in via withDetailedStatistics) ===
  
  /**
   * Per-arbitrary statistics.
   * Only populated when withDetailedStatistics() is enabled.
   */
  arbitraryStats?: Record<string, ArbitraryStatistics>
}

/**
 * Result of a coverage requirement check.
 */
interface CoverageResult {
  /** Label associated with this coverage requirement */
  label: string
  
  /** Required minimum percentage */
  requiredPercentage: number
  
  /** Observed percentage */
  observedPercentage: number
  
  /** Number of tests that satisfied the condition */
  count: number
  
  /** Whether the requirement was met with statistical confidence */
  satisfied: boolean
  
  /** 95% confidence interval for the true percentage */
  confidenceInterval: [number, number]
}

/**
 * Statistics for a single arbitrary.
 */
interface ArbitraryStatistics {
  /** Number of samples generated */
  samplesGenerated: number
  
  /** Number of unique values generated */
  uniqueValues: number
  
  /** Number of corner cases tested (boundaries, special values) */
  cornerCasesTested: number
  
  /** Distribution summary for numeric arbitraries */
  distributionSummary?: {
    min: number | string
    max: number | string
    mean?: number
    median?: number
    percentiles?: Record<string, number>  // e.g., { "25": 10, "50": 25, "75": 50 }
  }
}
```

### Enhanced FluentResult

```typescript
/**
 * Result of a property-based test execution.
 * Extended to include comprehensive statistics.
 */
interface FluentResult<Rec extends {} = {}> {
  /** Whether a satisfying example was found (or property held for all tests) */
  satisfiable: boolean
  
  /** The example that satisfied/falsified the property */
  example: Rec
  
  /** Random seed for reproducibility */
  seed?: number
  
  /** Comprehensive test statistics (NEW) */
  statistics: FluentStatistics
}
```

## 2. Test Case Classification API

### Methods

```typescript
class FluentCheck<Rec, ParentRec> {
  /**
   * Classify test cases that satisfy a predicate.
   * 
   * @param predicate - Function that returns true for test cases to label
   * @param label - Label to apply when predicate is true
   * @returns FluentCheckClassify for chaining
   * 
   * @example
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .classify(({xs}) => xs.length === 0, 'empty')
   *   .classify(({xs}) => xs.length < 5, 'small')
   *   .classify(({xs}) => xs.length >= 5, 'large')
   *   .then(({xs}) => xs.sort().length === xs.length)
   *   .check()
   */
  classify(predicate: (args: Rec) => boolean, label: string): FluentCheckClassify<Rec, ParentRec>
  
  /**
   * Label test cases with a dynamic value.
   * 
   * @param fn - Function that returns a label for each test case
   * @returns FluentCheckClassify for chaining
   * 
   * @example
   * fc.scenario()
   *   .forall('x', fc.integer(-100, 100))
   *   .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
   *   .then(({x}) => Math.abs(x) >= 0)
   *   .check()
   */
  label(fn: (args: Rec) => string): FluentCheckClassify<Rec, ParentRec>
  
  /**
   * Collect values and aggregate by their string representation.
   * 
   * @param fn - Function that extracts a value to collect
   * @returns FluentCheckClassify for chaining
   * 
   * @example
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .collect(({xs}) => xs.length)  // Groups by array length
   *   .then(({xs}) => xs.sort().length === xs.length)
   *   .check()
   * // Statistics: { labels: { "0": 15, "1": 23, "2": 31, ... } }
   */
  collect<T>(fn: (args: Rec) => T): FluentCheckClassify<Rec, ParentRec>
}

/**
 * Classification node in the fluent chain.
 * Supports chaining multiple classifications.
 */
class FluentCheckClassify<Rec, ParentRec> extends FluentCheck<Rec, ParentRec> {
  /** Chain additional classification */
  and(predicate: (args: Rec) => boolean, label: string): FluentCheckClassify<Rec, ParentRec>
  
  /** Chain dynamic label */
  andLabel(fn: (args: Rec) => string): FluentCheckClassify<Rec, ParentRec>
  
  /** Chain value collection */
  andCollect<T>(fn: (args: Rec) => T): FluentCheckClassify<Rec, ParentRec>
}
```

### Type Inference Example

```typescript
// Full type inference - no explicit generics needed
const result = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .forall('y', fc.integer(-100, 100))
  .classify(({x, y}) => x + y === 0, 'sum-zero')     // TypeScript knows x, y are numbers
  .classify(({x, y}) => x * y < 0, 'opposite-signs')
  .label(({x, y}) => `quadrant-${Math.sign(x)}-${Math.sign(y)}`)
  .then(({x, y}) => x + y === y + x)
  .check()

// result.statistics.labels: Record<string, number>
console.log(result.statistics.labels)
// { 'sum-zero': 12, 'opposite-signs': 48, 'quadrant-1-1': 25, ... }
```

## 3. Coverage Requirements API

### Methods

```typescript
class FluentCheck<Rec, ParentRec> {
  /**
   * Require a minimum percentage of test cases to satisfy a condition.
   * 
   * @param percentage - Required minimum percentage (0-100)
   * @param predicate - Condition that must be satisfied
   * @param label - Label for this coverage requirement
   * @returns FluentCheckCoverage for chaining
   * 
   * @example
   * fc.scenario()
   *   .forall('x', fc.integer(-100, 100))
   *   .cover(5, ({x}) => x < 0, 'negative')      // At least 5% negative
   *   .cover(5, ({x}) => x > 0, 'positive')      // At least 5% positive
   *   .cover(1, ({x}) => x === 0, 'zero')        // At least 1% zero
   *   .then(({x}) => Math.abs(x) >= 0)
   *   .checkCoverage()  // Fails if coverage requirements not met
   */
  cover(percentage: number, predicate: (args: Rec) => boolean, label: string): FluentCheckCoverage<Rec, ParentRec>
  
  /**
   * Define coverage requirements as a table.
   * 
   * @param tableName - Name for this coverage table
   * @param categories - Map of category names to required percentages
   * @param getCategory - Function to categorize each test case
   * @returns FluentCheckCoverage for chaining
   * 
   * @example
   * fc.scenario()
   *   .forall('xs', fc.array(fc.integer()))
   *   .coverTable('sizes', { empty: 10, small: 30, large: 30 },
   *     ({xs}) => xs.length === 0 ? 'empty' : xs.length < 10 ? 'small' : 'large')
   *   .then(({xs}) => xs.sort().length === xs.length)
   *   .checkCoverage()
   */
  coverTable(
    tableName: string,
    categories: Record<string, number>,
    getCategory: (args: Rec) => string
  ): FluentCheckCoverage<Rec, ParentRec>
}

class FluentCheckCoverage<Rec, ParentRec> extends FluentCheck<Rec, ParentRec> {
  /** Chain additional coverage requirement */
  andCover(percentage: number, predicate: (args: Rec) => boolean, label: string): FluentCheckCoverage<Rec, ParentRec>
  
  /**
   * Execute tests and verify all coverage requirements are met.
   * Uses sequential statistical testing for verification.
   * 
   * @param options - Optional configuration
   * @returns FluentResult with coverage information
   * @throws Error if coverage requirements are not met with statistical confidence
   */
  checkCoverage(options?: CheckCoverageOptions): FluentResult<Rec>
}

interface CheckCoverageOptions {
  /** Confidence level for coverage verification (default: 0.95) */
  confidence?: number
  
  /** Maximum number of tests to run (default: 10000) */
  maxTests?: number
  
  /** Whether to continue past failures (default: false) */
  continueOnFailure?: boolean
}
```

### Coverage Verification Example

```typescript
const result = fc.scenario()
  .forall('x', fc.integer(-1000, 1000))
  .cover(10, ({x}) => x < -100, 'very-negative')
  .cover(10, ({x}) => x > 100, 'very-positive')
  .cover(5, ({x}) => x === 0, 'zero')  // Might fail - only 1 in 2001 chance
  .then(({x}) => x * x >= 0)
  .checkCoverage({ confidence: 0.99 })

// If coverage requirements met:
// result.statistics.coverageResults = [
//   { label: 'very-negative', required: 10, observed: 45.2, satisfied: true, ... },
//   { label: 'very-positive', required: 10, observed: 44.8, satisfied: true, ... },
//   { label: 'zero', required: 5, observed: 0.05, satisfied: false, ... }
// ]
```

## 4. Confidence-Based Termination API

### Strategy Configuration

```typescript
class FluentStrategyFactory {
  /**
   * Set target confidence level for test termination.
   * Tests will run until this confidence is achieved or maxIterations is reached.
   * 
   * @param level - Target confidence level (0-1, e.g., 0.99 for 99%)
   * @returns this for chaining
   * 
   * @example
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withConfidence(0.99)        // Target 99% confidence
   *     .withMaxIterations(10000))   // Cap at 10000 tests
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .check()
   */
  withConfidence(level: number): this
  
  /**
   * Set minimum confidence level before stopping.
   * If confidence is below this after sampleSize tests, continue testing.
   * 
   * @param level - Minimum confidence level (0-1)
   * @returns this for chaining
   */
  withMinConfidence(level: number): this
  
  /**
   * Enable or disable statistics collection.
   * 
   * @param enabled - Whether to collect basic statistics (default: true)
   * @returns this for chaining
   */
  withStatistics(enabled?: boolean): this
  
  /**
   * Enable detailed statistics collection (per-arbitrary stats, distribution analysis).
   * Has performance overhead - use only when needed.
   * 
   * @returns this for chaining
   */
  withDetailedStatistics(): this
}
```

### Check Method Variants

```typescript
class FluentCheckAssert<Rec, ParentRec> {
  /**
   * Execute tests with standard termination (fixed sample size).
   * Now includes statistics in result.
   */
  check(): FluentResult<Rec>
  
  /**
   * Execute tests until specified confidence level is achieved.
   * 
   * @param level - Target confidence level (0-1)
   * @param options - Optional configuration
   * @returns FluentResult with confidence statistics
   * 
   * @example
   * const result = fc.scenario()
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .checkWithConfidence(0.999)
   * 
   * console.log(result.statistics.confidence)  // >= 0.999
   * console.log(result.statistics.testsRun)    // Variable based on confidence achieved
   */
  checkWithConfidence(level: number, options?: ConfidenceOptions): FluentResult<Rec>
}

interface ConfidenceOptions {
  /** Maximum number of tests to run (default: 100000) */
  maxTests?: number
  
  /** Credible interval width (default: 0.95) */
  credibleIntervalWidth?: number
}
```

### Confidence Calculation Example

```typescript
// Run until 99.9% confident
const result = fc.scenario()
  .forall('n', fc.nat(1000))
  .then(({n}) => n >= 0)
  .checkWithConfidence(0.999)

console.log(result.statistics)
// {
//   testsRun: 6905,           // Ran until confidence achieved
//   testsPassed: 6905,
//   testsDiscarded: 0,
//   executionTimeMs: 45,
//   confidence: 0.9991,        // Achieved confidence
//   credibleInterval: [0.9995, 1.0]  // 95% credible interval for success rate
// }
```

## 5. Verbosity and Reporting API

### Verbosity Levels

```typescript
enum Verbosity {
  /** No output during execution */
  Quiet = 0,
  
  /** Default: only show counterexamples on failure */
  Normal = 1,
  
  /** Show progress and all test cases */
  Verbose = 2,
  
  /** Show detailed debugging information */
  Debug = 3
}

class FluentStrategyFactory {
  /**
   * Set verbosity level for test execution.
   * 
   * @param level - Verbosity level
   * @returns this for chaining
   */
  withVerbosity(level: Verbosity): this
}
```

### Check Options

```typescript
interface CheckOptions {
  /** Verbosity level for this check (overrides strategy) */
  verbose?: boolean | Verbosity
  
  /** Custom reporter function */
  reporter?: (result: FluentResult) => void
  
  /** Log statistics to console after execution */
  logStatistics?: boolean
}

class FluentCheckAssert<Rec, ParentRec> {
  check(options?: CheckOptions): FluentResult<Rec>
}
```

### Reporter API

```typescript
/**
 * FluentReporter enhanced with statistical output.
 */
class FluentReporter {
  /**
   * Assert result and format error with statistics.
   * 
   * @param result - Test result to check
   * @param options - Formatting options
   * @throws Error with detailed statistics on failure
   */
  static expect<Rec>(result: FluentResult<Rec>, options?: ExpectOptions): void
  
  /**
   * Format statistics as a human-readable string.
   * 
   * @param stats - Statistics to format
   * @param options - Formatting options
   */
  static formatStatistics(stats: FluentStatistics, options?: FormatOptions): string
}

interface ExpectOptions {
  /** Include full statistics in error message */
  verbose?: boolean
  
  /** Include label distribution table */
  showLabels?: boolean
  
  /** Include coverage results table */
  showCoverage?: boolean
}

interface FormatOptions {
  /** Output format */
  format?: 'text' | 'json' | 'markdown'
  
  /** Include detailed arbitrary stats */
  detailed?: boolean
}
```

### Reporting Example

```typescript
const result = fc.scenario()
  .forall('xs', fc.array(fc.integer(-100, 100)))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 5, 'small')
  .classify(({xs}) => xs.length >= 5, 'large')
  .cover(5, ({xs}) => xs.some(x => x < 0), 'has-negative')
  .then(({xs}) => xs.sort((a, b) => a - b).every((v, i, arr) => i === 0 || arr[i-1] <= v))
  .check({ logStatistics: true })

// Console output:
// ✓ Passed 1000 tests in 45ms
// 
// Labels:
//   empty:  15.2% (152)
//   small:  42.3% (423)
//   large:  42.5% (425)
// 
// Coverage:
//   has-negative: 87.3% (required: 5%) ✓
// 
// Confidence: 99.7% [0.995, 1.000]
```

## 6. Arbitrary Statistics Collection

### ArbitraryStatistics Interface

```typescript
interface ArbitraryStatistics {
  /** Name of the arbitrary in the test */
  name: string
  
  /** Number of samples generated */
  samplesGenerated: number
  
  /** Number of unique values (approximate for large domains) */
  uniqueValues: number
  
  /** Estimated entropy of generated values */
  entropy?: number
  
  /** Corner cases tested */
  cornerCases: {
    /** Corner cases that were tested */
    tested: Array<{ value: unknown; description: string }>
    /** Known corner cases for this arbitrary type */
    total: number
  }
  
  /** Distribution summary (for numeric types) */
  distribution?: {
    min: number
    max: number
    mean: number
    median: number
    stdDev: number
    percentiles: Record<number, number>  // { 10: x, 25: x, 50: x, 75: x, 90: x }
  }
  
  /** String length distribution (for string types) */
  stringLengths?: {
    min: number
    max: number
    mean: number
  }
  
  /** Array length distribution (for array types) */
  arrayLengths?: {
    min: number
    max: number
    mean: number
  }
}
```

### Usage Example

```typescript
const result = fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('x', fc.integer(1, 100))
  .forall('xs', fc.array(fc.integer(-10, 10), { maxLength: 20 }))
  .then(({x, xs}) => true)
  .check()

console.log(result.statistics.arbitraryStats)
// {
//   x: {
//     name: 'x',
//     samplesGenerated: 1000,
//     uniqueValues: 97,
//     cornerCases: {
//       tested: [{ value: 1, description: 'minimum' }, { value: 100, description: 'maximum' }],
//       total: 2
//     },
//     distribution: { min: 1, max: 100, mean: 50.3, median: 51, ... }
//   },
//   xs: {
//     name: 'xs',
//     samplesGenerated: 1000,
//     uniqueValues: 1000,
//     arrayLengths: { min: 0, max: 20, mean: 9.7 }
//   }
// }
```

## 7. Complete Usage Examples

### Example 1: Basic Classification

```typescript
import * as fc from 'fluent-check'

// Test that array reversal is an involution
const result = fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length === 1, 'singleton')
  .classify(({xs}) => xs.length > 10, 'large')
  .then(({xs}) => {
    const reversed = [...xs].reverse()
    return reversed.reverse().every((v, i) => v === xs[i])
  })
  .check()

if (!result.satisfiable) {
  console.log('Failed with counterexample:', result.example)
}
console.log('Label distribution:', result.statistics.labels)
```

### Example 2: Coverage Requirements

```typescript
// Test integer operations with coverage requirements
const result = fc.scenario()
  .forall('a', fc.integer(-1000, 1000))
  .forall('b', fc.integer(-1000, 1000))
  .cover(10, ({a}) => a < 0, 'a-negative')
  .cover(10, ({b}) => b < 0, 'b-negative')
  .cover(1, ({a, b}) => a === 0 || b === 0, 'has-zero')
  .cover(5, ({a, b}) => a * b < 0, 'opposite-signs')
  .then(({a, b}) => (a + b) - b === a)
  .checkCoverage()

console.log('Coverage results:')
result.statistics.coverageResults?.forEach(cr => {
  const status = cr.satisfied ? '✓' : '✗'
  console.log(`  ${status} ${cr.label}: ${cr.observedPercentage.toFixed(1)}% (required: ${cr.requiredPercentage}%)`)
})
```

### Example 3: Confidence-Based Testing

```typescript
// Test with high confidence for critical code
const result = fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.999)
    .withMaxIterations(50000))
  .forall('n', fc.nat(10000))
  .forall('m', fc.nat(10000))
  .then(({n, m}) => {
    // Test: GCD is commutative
    return gcd(n, m) === gcd(m, n)
  })
  .check()

console.log(`Achieved ${(result.statistics.confidence! * 100).toFixed(2)}% confidence after ${result.statistics.testsRun} tests`)
```

### Example 4: Comprehensive Statistical Analysis

```typescript
// Full statistical analysis of a sorting algorithm
const result = fc.scenario()
  .config(fc.strategy()
    .withDetailedStatistics()
    .withVerbosity(Verbosity.Verbose))
  .forall('xs', fc.array(fc.integer(-1000, 1000), { minLength: 0, maxLength: 100 }))
  .label(({xs}) => `length-${Math.floor(xs.length / 10) * 10}`)
  .classify(({xs}) => xs.every((v, i, arr) => i === 0 || arr[i-1] <= v), 'already-sorted')
  .classify(({xs}) => xs.every((v, i, arr) => i === 0 || arr[i-1] >= v), 'reverse-sorted')
  .classify(({xs}) => new Set(xs).size === xs.length, 'all-unique')
  .cover(5, ({xs}) => xs.length === 0, 'empty')
  .cover(5, ({xs}) => xs.length === 1, 'singleton')
  .then(({xs}) => {
    const sorted = [...xs].sort((a, b) => a - b)
    // Sorted array should be permutation of original
    return sorted.length === xs.length &&
           sorted.every((v, i, arr) => i === 0 || arr[i-1] <= v)
  })
  .checkCoverage({ confidence: 0.99 })

// Access comprehensive statistics
const stats = result.statistics
console.log(`
Test Summary:
  Tests run: ${stats.testsRun}
  Execution time: ${stats.executionTimeMs}ms
  Confidence: ${(stats.confidence! * 100).toFixed(2)}%

Label Distribution:
${Object.entries(stats.labels || {})
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([label, count]) => `  ${label}: ${count} (${(count / stats.testsRun * 100).toFixed(1)}%)`)
  .join('\n')}

Coverage Results:
${stats.coverageResults?.map(cr => 
  `  ${cr.satisfied ? '✓' : '✗'} ${cr.label}: ${cr.observedPercentage.toFixed(1)}% (required: ${cr.requiredPercentage}%)`
).join('\n')}

Array Length Distribution:
  ${JSON.stringify(stats.arbitraryStats?.xs?.arrayLengths)}
`)
```

## Type Safety Validation

All proposed APIs maintain full type inference:

```typescript
// Types flow correctly through the chain
fc.scenario()
  .forall('x', fc.integer())           // x: number
  .forall('xs', fc.array(fc.string())) // xs: string[]
  .classify(({x, xs}) => {
    // TypeScript knows: x is number, xs is string[]
    return x > xs.length
  }, 'x-greater')
  .then(({x, xs}) => {
    // Same type knowledge here
    return typeof x === 'number' && Array.isArray(xs)
  })
  .check()

// Coverage predicates also have full type inference
fc.scenario()
  .forall('point', fc.record({
    x: fc.real(-100, 100),
    y: fc.real(-100, 100)
  }))
  .cover(25, ({point}) => point.x > 0 && point.y > 0, 'quadrant-1')
  .cover(25, ({point}) => point.x < 0 && point.y > 0, 'quadrant-2')
  .then(({point}) => point.x * point.x + point.y * point.y >= 0)
  .checkCoverage()
```

## Backwards Compatibility

All changes are additive:

1. **FluentResult**: `statistics` field is new; existing fields unchanged
2. **FluentCheck**: New methods (`classify`, `cover`, etc.) don't affect existing methods
3. **FluentStrategy**: New configuration options have sensible defaults
4. **Basic statistics**: Collected by default with minimal overhead

Existing code continues to work:

```typescript
// This still works exactly as before
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// result.satisfiable, result.example, result.seed all work as before
// result.statistics is NEW but doesn't break anything
```

## References

- QuickCheck label/classify: https://hackage.haskell.org/package/QuickCheck-2.14.3/docs/Test-QuickCheck.html
- Hypothesis statistics: https://hypothesis.readthedocs.io/en/latest/settings.html#statistics
- fast-check statistics: https://fast-check.dev/docs/core-blocks/runners/
