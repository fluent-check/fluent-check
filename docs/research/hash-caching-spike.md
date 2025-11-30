# Hash Caching Spike: Performance Analysis

## Objective

Evaluate whether caching hash values in `FluentPick` would improve performance for `sampleUnique()` operations.

## Background

Currently, hash values are computed on-demand during deduplication:
```typescript
const h = hash(value)  // Computed every time has() is called
```

This means for a pick that's checked multiple times, the hash is recomputed each time.

## Hypothesis

Caching hashes in `FluentPick` will:
- **Improve performance** for large samples with repeated comparisons
- **Increase memory usage** by 4-8 bytes per pick
- **Benefit complex values** (nested objects, large arrays) more than primitives

## Test Scenarios

### Scenario 1: Large Sample of Simple Values
```typescript
// Many picks, simple hash computation
const arb = fc.integer(0, 1000)
const samples = arb.sampleUnique(10000)
// Expected: Minimal benefit (hash is O(1) for integers)
```

### Scenario 2: Small Sample of Complex Values
```typescript
// Few picks, expensive hash computation
const arb = fc.array(fc.record({
  id: fc.integer(),
  name: fc.string(),
  tags: fc.array(fc.string())
}), 10, 20)
const samples = arb.sampleUnique(100)
// Expected: Significant benefit (hash requires JSON.stringify for each comparison)
```

### Scenario 3: Mixed Workload
```typescript
// Real-world usage pattern
const arb = fc.tuple(
  fc.integer(0, 1000),
  fc.array(fc.string(1, 10), 0, 5),
  fc.record({x: fc.real(), y: fc.real()})
)
const samples = arb.sampleUnique(5000)
// Expected: Moderate benefit
```

## Metrics to Measure

1. **CPU Time:**
   - Total time for `sampleUnique()` call
   - Time spent in hash computation
   - Number of hash function calls

2. **Memory Usage:**
   - Memory per `FluentPick` (with and without hash)
   - Total memory for sample
   - Memory overhead percentage

3. **Hash Computation Count:**
   - How many times is hash computed per pick?
   - Average hash computations per unique value

## Implementation Options

### Option A: Always Cache
```typescript
export type FluentPick<V> = {
  value: V
  original?: any
  _hash?: number  // Cached hash value
}
```

**Pros:**
- Simple implementation
- Always benefits from caching

**Cons:**
- Memory overhead even when not needed
- Requires hash function at pick creation time

### Option B: Lazy Cache
```typescript
export type FluentPick<V> = {
  value: V
  original?: any
  _hash?: number  // Computed on first access
}

// In sampleUnique:
const getHash = (pick: FluentPick<A>): number => {
  if (pick._hash === undefined) {
    pick._hash = hash(pick.value)
  }
  return pick._hash
}
```

**Pros:**
- Only caches when needed
- No overhead for picks that aren't compared

**Cons:**
- Mutates pick object
- Slightly more complex

### Option C: External Cache
```typescript
// Keep FluentPick unchanged, use WeakMap
const hashCache = new WeakMap<FluentPick<A>, number>()

const getHash = (pick: FluentPick<A>): number => {
  if (!hashCache.has(pick)) {
    hashCache.set(pick, hash(pick.value))
  }
  return hashCache.get(pick)!
}
```

**Pros:**
- Doesn't mutate FluentPick
- Automatic cleanup when picks are GC'd

**Cons:**
- WeakMap overhead
- Cache lives beyond sampleUnique() call

## Benchmark Plan

1. **Baseline:** Current implementation (on-demand)
2. **Variant A:** Always cache in FluentPick
3. **Variant B:** Lazy cache in FluentPick
4. **Variant C:** External WeakMap cache

For each variant, measure:
- Time for 100 runs of each scenario
- Memory usage (heap snapshots)
- Hash computation count (instrumentation)

## Success Criteria

Cache implementation is worthwhile if:
- **Performance improvement:** > 10% faster for complex values
- **Memory overhead:** < 20% increase in memory usage
- **No regressions:** Simple values don't get slower

## Expected Results

Based on analysis:
- **Simple values (integers, booleans):** Minimal benefit, may even be slower due to memory overhead
- **Complex values (nested objects):** Significant benefit (20-50% faster)
- **Mixed workload:** Moderate benefit (10-20% faster)

## Recommendation

**Defer implementation** unless profiling shows hash computation is a bottleneck. The current on-demand approach is:
- Simple and correct
- Memory-efficient
- Fast enough for most use cases

If implemented, use **Option B (Lazy Cache)** as it provides the best balance of performance and memory efficiency.

## Related Issues

- Performance profiling: See `docs/performance/cpu-profile.md`
- Memory profiling: See `docs/performance/memory-profile.md`
