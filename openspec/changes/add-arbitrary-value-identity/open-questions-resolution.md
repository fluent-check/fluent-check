# Open Questions Resolution: Value Identity Functions

This document addresses the three open questions from the original proposal and documents the decisions made during implementation.

## Question 1: Hash Type - `number` vs `bigint`

**Status: ✅ RESOLVED**

**Decision:** Use `number` (32-bit unsigned integer)

**Rationale (from design.md Decision 2):**
- JavaScript `Map`/`Set` use `SameValueZero`, which works efficiently with numbers
- Bitwise operations are faster on 32-bit integers
- No BigInt allocation overhead
- 32-bit hash space is sufficient because:
  - Hash collisions are acceptable (equals() is authoritative)
  - Sample sizes are typically reasonable (< 1M elements)
  - The trade-off favors performance over perfect distribution

**Implementation:**
```typescript
export type HashFunction<A = unknown> = (a: A) => number
```

**Evidence:**
- All hash functions return `number`
- Hash mixing uses 32-bit operations (`hash >>> 0`)
- FNV-1a algorithm produces 32-bit hashes

**Conclusion:** No spike needed. The decision was correct for the use case.

---

## Question 2: Hash Caching in FluentPick

**Status: ❓ NOT IMPLEMENTED (Requires Spike)**

**Current State:**
```typescript
export type FluentPick<V> = {
  value: V
  original?: any
  // NO hash field
}
```

**The Question:**
Should we cache computed hash values in `FluentPick` to avoid recomputing hashes during deduplication?

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Cache in FluentPick** | • Avoids recomputation<br>• Faster repeated lookups<br>• Better for large/complex values | • Increases memory per pick<br>• Adds 4-8 bytes per pick<br>• Memory pressure for large samples |
| **Compute on-demand** | • Lower memory footprint<br>• Simpler data structure<br>• No cache invalidation concerns | • Recomputes hash multiple times<br>• Slower for repeated comparisons<br>• CPU overhead for complex values |

**Current Implementation:**
Hashes are computed on-demand in `sampleUnique()`:
```typescript
const has = (value: A): boolean => {
  const h = hash(value)  // Computed every time
  const bucket = buckets.get(h)
  return bucket !== undefined && bucket.some(p => eq(p.value, value))
}
```

**Spike Needed:**
1. **Benchmark current approach** with large samples (10K-100K picks)
2. **Measure hash computation time** vs memory overhead
3. **Test with complex values** (nested objects, large arrays)
4. **Compare performance** of cached vs on-demand

**Recommendation:**
- **For now:** Keep on-demand computation (current implementation)
- **Future optimization:** Add optional hash caching if profiling shows it's a bottleneck
- **Implementation approach:** Add optional `_hash?: number` field (underscore indicates internal)

**Spike Plan:**
```typescript
// Test scenario 1: Large sample of simple values
fc.integer(0, 1000).sampleUnique(10000)

// Test scenario 2: Small sample of complex values  
fc.array(fc.record({...}), 10, 20).sampleUnique(100)

// Test scenario 3: Mixed workload
// Measure: CPU time, memory usage, hash computation count
```

---

## Question 3: MappedArbitrary Identity Derivation

**Status: ✅ RESOLVED**

**Decision:** Always fallback to base class (use `JSON.stringify`)

**Rationale (from design.md Decision 6):**
- The transformation function `f` is opaque
- Different inputs may map to equal outputs (non-injective)
- Fallback to stringify is correct, even if slower
- Future: Could accept optional `hashCode`/`equals` in shrinkHelper parameter

**Current Implementation:**
```typescript
// MappedArbitrary does NOT override hashCode() or equals()
// It inherits from Arbitrary base class, which uses JSON.stringify fallback
```

**Why This Is Correct:**
1. **Non-injective mappings:** `map(x => x % 2)` maps many inputs to same output
2. **Opaque transformations:** Cannot derive identity without knowing `f` semantics
3. **Correctness over speed:** Stringify ensures correct deduplication
4. **Incremental optimization:** Can add optional identity functions later if needed

**Future Enhancement (Optional):**
If a mapped arbitrary has a known bijective mapping, we could accept identity functions:
```typescript
fc.integer(0, 10)
  .map(x => x * 2, {
    inverseMap: b => [b / 2],
    hashCode: () => (b: number) => b | 0,  // NEW: optional identity
    equals: () => (a: number, b: number) => a === b
  })
```

**Conclusion:** No spike needed. The decision is correct for correctness and simplicity.

---

## Summary

| Question | Status | Decision | Spike Needed? |
|----------|--------|----------|--------------|
| 1. Hash type | ✅ Resolved | Use `number` | No |
| 2. Hash caching | ❓ Open | Keep on-demand (for now) | Yes (optional) |
| 3. MappedArbitrary | ✅ Resolved | Always fallback | No |

## Next Steps

1. **Monitor performance** of `sampleUnique()` in production usage
2. **Profile hash computation** if performance issues arise
3. **Consider hash caching spike** if profiling shows hash computation is a bottleneck
4. **Document** that hash caching is a future optimization opportunity

## References

- Original proposal: `openspec/changes/add-arbitrary-value-identity/proposal.md`
- Design decisions: `openspec/changes/add-arbitrary-value-identity/design.md`
- Implementation: `src/arbitraries/Arbitrary.ts`
