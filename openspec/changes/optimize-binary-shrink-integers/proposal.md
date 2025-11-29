# Change: Optimize Integer Shrinking with Binary Search

> **GitHub Issue:** [#453](https://github.com/fluent-check/fluent-check/issues/453)

## Why

Currently, FluentCheck's integer shrinking generates candidates linearly (e.g., shrinking from 100 yields 0, 1, 2, ... 99). This is inefficient for large values:

- **Linear time complexity**: Shrinking from N requires up to N candidates
- **Slow convergence**: Finding minimal counterexample near 0 is fast, but finding one near N/2 is slow
- **Wasted computation**: Many candidates are generated but never tested if an earlier one fails

Binary search shrinking (standard in QuickCheck, Hypothesis, fast-check) finds minimal counterexamples in O(log N) steps.

## What Changes

- **Refactor `ArbitraryInteger.shrink()`** to use binary search toward zero
- **Apply same pattern** to `ArbitraryReal` and other numeric arbitraries
- **Preserve boundary testing**: Ensure 0 and boundary values are tested early

### Current Behavior

```typescript
// Shrinking 100 toward 0 (linear)
// Candidates: 0, 1, 2, 3, ... 99
// Total: 100 candidates
```

### Proposed Behavior

```typescript
// Shrinking 100 toward 0 (binary search)
// Candidates: 0, 50, 75, 88, 94, 97, 99
// Total: 7 candidates (log₂(100))
```

### Technical Approach

```typescript
*shrink(initial: FluentPick<number>): Generator<FluentPick<number>> {
  const target = 0  // or this.min if min > 0
  let lo = target
  let hi = initial.value
  
  // Always try target first
  if (lo !== hi) {
    yield { value: lo, original: lo }
  }
  
  // Binary search between target and current value
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    yield { value: mid, original: mid }
    // Strategy will update lo or hi based on test result
    // For now, assume we're generating all candidates
    lo = mid
  }
}
```

## Impact

- **Affected specs**: `specs/shrinking/spec.md`
- **Affected code**: 
  - `src/arbitraries/ArbitraryInteger.ts`
  - `src/arbitraries/ArbitraryReal.ts`
- **Breaking change**: No - shrinking still finds minimal counterexamples, just faster
- **Performance**: O(log N) vs O(N) shrink candidates for integers

## Complexity Estimate

**Low Complexity** (few hours)

| Component | Effort | Notes |
|-----------|--------|-------|
| `ArbitraryInteger.shrink()` | Low | Simple algorithm change |
| `ArbitraryReal.shrink()` | Low | Same pattern |
| Test updates | Low | Verify shrinking quality unchanged |

## Success Criteria

1. Shrinking large integers (>1000) completes significantly faster
2. Minimal counterexamples are still found (quality unchanged)
3. All existing shrinking tests pass
4. Benchmark shows O(log N) candidate generation

## Related Issues

- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Refactor shrink trees to lazy generators
- [#138](https://github.com/fluent-check/fluent-check/issues/138) - Shrinking timeout issues (partial fix)
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance profiling identified shrinking as optimization area

## Independence

This change is **independent** of #452 (lazy generators). Binary search can be implemented with either:
- Current `Arbitrary<A>` return type
- Proposed `Generator<FluentPick<A>>` return type

Implementing this first provides immediate value and reduces the scope of #452.
