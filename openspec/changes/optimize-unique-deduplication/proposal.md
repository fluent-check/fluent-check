# Change: Optimize UniqueArbitrary Deduplication

> **GitHub Issue:** [#456](https://github.com/fluent-check/fluent-check/issues/456)

## Why

`UniqueArbitrary` currently uses O(n²) array iteration for deduplication because JavaScript's `Set` doesn't support custom equality comparisons. This becomes a performance bottleneck when:

1. **Large sample sizes**: `forall` and `exists` use UniqueArbitrary internally
2. **High-cardinality types**: Objects, arrays, and complex types need deep equality
3. **Small populations with many samples**: High collision rate amplifies the O(n²) cost

Issue [#7](https://github.com/fluent-check/fluent-check/issues/7) identified this as a performance concern, particularly for large sample requests.

## What Changes

- **Implement efficient deduplication** using hash-based lookup
- **Add custom equality support** for complex types
- **Use serialization-based hashing** for JSON-serializable types
- **Fall back to O(n²)** only for non-serializable types with custom equality

### Current Implementation

```typescript
// O(n²) - iterates through all seen values for each new value
class UniqueArbitrary<A> extends Arbitrary<A> {
  private seen: A[] = []
  
  pick(generator: Random): FluentPick<A> | typeof NoValue {
    const candidate = this.arbitrary.pick(generator)
    // Linear search through all seen values
    if (this.seen.some(v => deepEqual(v, candidate.value))) {
      return NoValue
    }
    this.seen.push(candidate.value)
    return candidate
  }
}
```

### Proposed Implementation

```typescript
// O(1) amortized - uses hash-based lookup
class UniqueArbitrary<A> extends Arbitrary<A> {
  private seenHashes = new Set<string>()
  private seenValues: A[] = []  // For non-hashable types
  
  pick(generator: Random): FluentPick<A> | typeof NoValue {
    const candidate = this.arbitrary.pick(generator)
    const hash = this.computeHash(candidate.value)
    
    if (hash !== null) {
      // Fast path: hashable value
      if (this.seenHashes.has(hash)) return NoValue
      this.seenHashes.add(hash)
    } else {
      // Slow path: non-hashable, use deep equality
      if (this.seenValues.some(v => deepEqual(v, candidate.value))) return NoValue
      this.seenValues.push(candidate.value)
    }
    return candidate
  }
  
  private computeHash(value: A): string | null {
    try {
      return JSON.stringify(value)
    } catch {
      return null  // Circular references, functions, etc.
    }
  }
}
```

## Impact

- **Affected specs**: `specs/arbitraries/spec.md`
- **Affected code**:
  - `src/arbitraries/UniqueArbitrary.ts`
- **Breaking change**: No - same behavior, faster
- **Performance**: O(n²) → O(n) for most types

## Complexity Estimate

**Low Complexity** (few hours)

| Component | Effort | Notes |
|-----------|--------|-------|
| Hash-based deduplication | Low | JSON.stringify for most types |
| Fallback for non-hashable | Low | Keep existing O(n²) path |
| Test updates | Low | Verify correctness unchanged |
| Benchmark | Low | Measure improvement |

## Success Criteria

1. UniqueArbitrary maintains correct uniqueness behavior
2. Performance improves from O(n²) to O(n) for JSON-serializable types
3. Non-serializable types still work (with O(n²) fallback)
4. Large sample sizes (>1000) complete significantly faster

## Related Issues

- [#7](https://github.com/fluent-check/fluent-check/issues/7) - Original issue: optimize unique deduplicator
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance baseline (high-arity tests)
- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Performance optimization umbrella

## Independence

This proposal is **fully independent**:
- No dependency on shrinking changes
- No dependency on other arbitrary changes
- Self-contained optimization to a single class
