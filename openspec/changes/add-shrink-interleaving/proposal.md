# Change: Add Interleaved Element Shrinking for Composite Types

> **GitHub Issue:** [#454](https://github.com/fluent-check/fluent-check/issues/454)

## Why

When shrinking composite types (tuples, records, arrays), the current approach processes each position sequentially—exhausting all shrink candidates for position 0 before moving to position 1. This can cause:

1. **Suboptimal search**: If the minimal counterexample requires shrinking position 2, positions 0-1 are fully explored first
2. **Slower convergence**: Time wasted on positions that don't contribute to minimality
3. **Unfair exploration**: Later positions are disadvantaged in the search

Interleaved shrinking (round-robin through positions) provides fairer exploration and often finds minimal counterexamples faster.

## What Changes

- **Refactor composite shrinking** to interleave candidates across element positions
- **Apply to `ArbitraryTuple`**, `ArbitraryRecord`, and `ArbitraryArray`
- **Preserve correctness**: All shrink candidates are still explored, just in different order

### Current Behavior

```typescript
// Shrinking tuple [100, 200, 300]
// Sequential: exhaust position 0, then 1, then 2
// Order: [0,200,300], [50,200,300], [75,200,300], ... [99,200,300],
//        [100,0,300], [100,100,300], ... [100,199,300],
//        [100,200,0], [100,200,150], ... [100,200,299]
```

### Proposed Behavior

```typescript
// Shrinking tuple [100, 200, 300]
// Interleaved: round-robin through positions
// Order: [0,200,300], [100,0,300], [100,200,0],
//        [50,200,300], [100,100,300], [100,200,150],
//        [75,200,300], [100,150,300], [100,200,225], ...
```

### Technical Approach

```typescript
*shrinkTuple(initial: FluentPick<A[]>): Generator<FluentPick<A[]>> {
  const values = initial.value
  const generators = this.arbitraries.map((arb, i) => 
    arb.shrink({ value: values[i], original: values[i] })
  )
  
  // Round-robin through positions until all exhausted
  let hasMore = true
  while (hasMore) {
    hasMore = false
    for (let i = 0; i < generators.length; i++) {
      const next = generators[i].next()
      if (!next.done) {
        hasMore = true
        yield {
          value: [...values.slice(0, i), next.value.value, ...values.slice(i + 1)],
          original: [...values.slice(0, i), next.value.original, ...values.slice(i + 1)]
        }
      }
    }
  }
}
```

## Impact

- **Affected specs**: `specs/shrinking/spec.md`
- **Affected code**:
  - `src/arbitraries/ArbitraryTuple.ts`
  - `src/arbitraries/ArbitraryRecord.ts`
  - `src/arbitraries/ArbitraryArray.ts`
- **Breaking change**: No - observable behavior unchanged, only search order
- **Correlation**: Enhances [#452](https://github.com/fluent-check/fluent-check/issues/452) but can be implemented independently

## Complexity Estimate

**Medium Complexity** (1 day)

| Component | Effort | Notes |
|-----------|--------|-------|
| `ArbitraryTuple.shrink()` | Medium | Core interleaving logic |
| `ArbitraryRecord.shrink()` | Low | Same pattern as tuple |
| `ArbitraryArray.shrink()` | Medium | Length shrinking + element interleaving |
| Test updates | Low | Verify shrinking quality unchanged |

## Success Criteria

1. Shrinking composite types finds minimal counterexamples at least as quickly
2. All existing shrinking tests pass
3. No regression in simple cases
4. Complex nested types show improved average shrink time

## Related Issues

- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Refactor shrink trees to lazy generators
- [#138](https://github.com/fluent-check/fluent-check/issues/138) - Shrinking timeout (interleaving helps avoid getting stuck)
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance profiling baseline

## Correlation with #452

This proposal is **correlated but independent** of #452:
- Can be implemented with current `Arbitrary<A>` return type
- Naturally fits with generator-based approach in #452
- Implementing with #452 avoids double refactoring of composite shrink methods

**Recommendation**: Implement as part of #452 to avoid churning the same code twice.
