# Performance Analysis: Statistical Features Overhead

This document analyzes the expected performance impact of adding statistical features to FluentCheck and provides recommendations for minimizing overhead.

## 1. Current Baseline Performance

### Test Execution Profile

Based on code analysis of FluentCheck's current implementation:

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| Random number generation | O(1) | Using PRNG |
| Arbitrary value generation | O(1) to O(n) | Depends on arbitrary type |
| Property evaluation | O(1) | User-defined |
| Result construction | O(1) | Simple object creation |
| Shrinking (on failure) | O(k × n) | k = shrink attempts, n = value size |

### Expected Baseline Performance

Typical property-based testing frameworks achieve:

| Metric | Typical Range | FluentCheck Expected |
|--------|---------------|---------------------|
| Tests per second (simple) | 50,000 - 200,000 | ~100,000 |
| Tests per second (complex) | 5,000 - 20,000 | ~10,000 |
| Memory per test | 100-500 bytes | ~200 bytes |
| Startup overhead | 1-5ms | ~2ms |

### Current FluentResult Overhead

```typescript
// Current FluentResult - minimal overhead
class FluentResult<Rec> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly seed?: number
  ) {}
}
```

**Memory**: ~24 bytes base + example object size
**Construction**: O(1), ~0.1µs

## 2. Proposed Statistics Overhead Analysis

### Basic Statistics Collection

```typescript
interface BasicStatistics {
  testsRun: number          // 8 bytes
  testsPassed: number       // 8 bytes
  testsDiscarded: number    // 8 bytes
  executionTimeMs: number   // 8 bytes
}
```

**Per-test operations:**
- Increment counter: O(1), ~1ns
- Check pass/fail: O(1), ~1ns

**Total overhead**: ~2-5ns per test (0.002-0.005µs)

**Impact**: Negligible (<0.01% overhead)

### Label/Classification Tracking

```typescript
// Using Map for label counting
const labels = new Map<string, number>()

// Per-test operation
function recordLabel(label: string) {
  labels.set(label, (labels.get(label) || 0) + 1)
}
```

**Per-test operations:**
- String comparison/hash: O(label_length), ~10-50ns
- Map lookup/insert: O(1) amortized, ~10-20ns

**Total overhead per classify call**: ~20-70ns

**Impact for typical usage (3-5 labels)**:
- Overhead: ~100-350ns per test
- Relative to ~10µs test: ~1-3.5% overhead

### Coverage Requirement Tracking

```typescript
// Per coverage requirement
function checkCoverage(predicate: (args: unknown) => boolean): boolean {
  return predicate(args)  // Already evaluated for labels
}
```

**Per-test operations:**
- Predicate evaluation: Already counted in label overhead
- Increment counter: O(1), ~1ns

**Impact**: Minimal additional overhead if predicates shared with labels

### Confidence Calculation

```typescript
// Only calculated at end, not per-test
function calculateConfidence(n: number, k: number): number {
  return 1 - jstat.beta.cdf(1 - epsilon, n - k + 1, k + 1)
}
```

**One-time calculation**: O(1), ~1-10µs

**Impact**: Negligible (not per-test)

### Detailed Arbitrary Statistics (Opt-in)

```typescript
interface ArbitraryStatistics {
  samplesGenerated: number
  uniqueValues: Set<unknown>  // Memory concern
  distribution: StreamingQuantile  // Algorithm overhead
}
```

**Per-test operations:**
- Counter increment: O(1), ~1ns
- Unique tracking: O(1) amortized, but O(n) memory
- Streaming quantile: O(log n), ~50-100ns

**Impact**: Significant
- Time: ~50-100ns per test (~0.5-1% overhead)
- Memory: O(n) for unique tracking, O(log n) for quantiles

## 3. Memory Analysis

### Current Memory Profile

| Component | Size | Notes |
|-----------|------|-------|
| FluentResult | ~24 bytes | Base object |
| Example object | Variable | User data |
| Strategy state | ~100 bytes | Iteration counters |

### Proposed Memory Profile

| Component | Size | Notes |
|-----------|------|-------|
| FluentStatistics (basic) | ~64 bytes | Fixed counters |
| Labels Map | ~48 bytes + entries | ~50 bytes per unique label |
| Coverage results | ~100 bytes per requirement | Array of results |
| Arbitrary stats (opt-in) | O(n) | For unique tracking |

### Memory Recommendations

1. **Basic stats**: Always allocate (fixed 64 bytes)
2. **Labels**: Lazy allocation only when classify() used
3. **Coverage**: Lazy allocation only when cover() used
4. **Detailed stats**: Opt-in only, use streaming algorithms

**Maximum memory overhead (typical use):**
- ~64 bytes for basic stats
- ~200 bytes for 4 labels
- ~400 bytes for 4 coverage requirements
- **Total**: ~664 bytes per test run (not per test)

## 4. Benchmarking Strategy

### Proposed Benchmark Suite

```typescript
// Benchmark categories
const benchmarks = {
  // Baseline (no stats)
  baseline: () => fc.scenario().forall('x', fc.integer()).then(() => true).check(),
  
  // Basic stats (default)
  basicStats: () => fc.scenario().forall('x', fc.integer()).then(() => true).check(),
  
  // With classification
  withClassify: () => fc.scenario()
    .forall('x', fc.integer(-100, 100))
    .classify(({x}) => x < 0, 'negative')
    .classify(({x}) => x > 0, 'positive')
    .classify(({x}) => x === 0, 'zero')
    .then(() => true)
    .check(),
  
  // With coverage
  withCoverage: () => fc.scenario()
    .forall('x', fc.integer(-100, 100))
    .cover(10, ({x}) => x < 0, 'negative')
    .cover(10, ({x}) => x > 0, 'positive')
    .then(() => true)
    .checkCoverage(),
  
  // With detailed stats (opt-in)
  detailed: () => fc.scenario()
    .config(fc.strategy().withDetailedStatistics())
    .forall('x', fc.integer())
    .then(() => true)
    .check()
}
```

### Expected Results

| Benchmark | Expected Overhead | Acceptable Threshold |
|-----------|-------------------|---------------------|
| Basic stats | <1% | 2% |
| Classification (3 labels) | 1-3% | 5% |
| Coverage (3 requirements) | 2-5% | 10% |
| Detailed stats | 5-10% | 15% |

## 5. Optimization Strategies

### Strategy 1: Lazy Initialization

```typescript
class FluentStatistics {
  private _labels?: Map<string, number>
  
  get labels(): Record<string, number> {
    if (!this._labels) return {}
    return Object.fromEntries(this._labels)
  }
  
  recordLabel(label: string) {
    if (!this._labels) this._labels = new Map()
    this._labels.set(label, (this._labels.get(label) || 0) + 1)
  }
}
```

### Strategy 2: Batched Updates

```typescript
// Instead of updating after every test
let pendingUpdates = 0
const BATCH_SIZE = 100

function recordTest() {
  pendingUpdates++
  if (pendingUpdates >= BATCH_SIZE) {
    flushUpdates()
    pendingUpdates = 0
  }
}
```

### Strategy 3: Streaming Algorithms

For distribution tracking, use streaming quantile algorithms (P² algorithm or t-digest):

```typescript
class StreamingQuantile {
  private markers: number[] = new Array(5)
  private positions: number[] = [0, 1, 2, 3, 4]
  private idealPositions: number[] = [0, 0.25, 0.5, 0.75, 1]
  
  update(value: number) {
    // P² algorithm: O(1) update, O(1) memory
    // Provides approximate quantiles
  }
  
  getQuantile(p: number): number {
    // Piecewise parabolic interpolation
  }
}
```

### Strategy 4: Sampling for Unique Count

```typescript
class HyperLogLog {
  private registers: Uint8Array
  
  add(value: unknown) {
    // O(1) update
    // Estimates unique count with ~2% error
    // Uses only O(log log n) memory
  }
  
  count(): number {
    // Returns estimated unique count
  }
}
```

## 6. Performance Recommendations

### Default Configuration (Recommended)

```typescript
// Basic stats: Always on (< 0.01% overhead)
// Labels: On when classify() used (~1-3% overhead)
// Coverage: On when cover() used (~2-5% overhead)
// Confidence: Calculated once at end (negligible)
// Detailed stats: Off by default

fc.scenario()
  .forall('x', fc.integer())
  .classify(({x}) => x < 0, 'negative')  // Enables label tracking
  .then(({x}) => x * x >= 0)
  .check()
```

### High-Performance Configuration

For performance-critical testing where statistics are not needed:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withStatistics(false)     // Disable all statistics
    .withSampleSize(10000))    // Many tests, minimal overhead
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

### Research/Analysis Configuration

When detailed analysis is needed (accepts overhead):

```typescript
fc.scenario()
  .config(fc.strategy()
    .withDetailedStatistics()  // Enable all stats
    .withVerbosity(Verbosity.Verbose))
  .forall('x', fc.integer(-100, 100))
  .classify(({x}) => x < 0, 'negative')
  .classify(({x}) => x > 0, 'positive')
  .cover(10, ({x}) => x < -50, 'very-negative')
  .then(({x}) => x * x >= 0)
  .check({ logStatistics: true })
```

## 7. Implementation Phases and Performance Targets

| Phase | Feature | Target Overhead |
|-------|---------|-----------------|
| 1 | Basic statistics | < 1% |
| 2 | Label/classify | < 5% |
| 3 | Coverage checking | < 10% |
| 4 | Confidence-based stopping | < 5% |
| 5 | Detailed arbitrary stats | < 15% (opt-in) |

## 8. Monitoring and Validation

### Continuous Benchmarking

Add benchmark tests to CI:

```typescript
describe('Performance', () => {
  it('basic stats overhead should be < 1%', () => {
    const baseline = benchmarkWithoutStats()
    const withStats = benchmarkWithBasicStats()
    
    const overhead = (withStats - baseline) / baseline
    expect(overhead).to.be.below(0.01)
  })
  
  it('classification overhead should be < 5%', () => {
    const baseline = benchmarkWithoutClassify()
    const withClassify = benchmarkWith3Labels()
    
    const overhead = (withClassify - baseline) / baseline
    expect(overhead).to.be.below(0.05)
  })
})
```

## Summary

| Feature | Time Overhead | Memory Overhead | Default |
|---------|---------------|-----------------|---------|
| Basic stats | ~0.01% | 64 bytes | On |
| Classification | ~1-3% | 50 bytes/label | When used |
| Coverage | ~2-5% | 100 bytes/req | When used |
| Confidence calc | negligible | 0 | On demand |
| Detailed stats | ~5-10% | O(n) | Opt-in |

**Conclusion**: Statistics collection can be implemented with acceptable overhead (<10% for typical use cases) by using lazy initialization, efficient data structures, and streaming algorithms for detailed statistics.
