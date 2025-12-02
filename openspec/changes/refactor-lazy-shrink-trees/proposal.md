# Change: Refactor Shrink Trees to Lazy Generator-Based Construction

> **GitHub Issue:** [#452](https://github.com/fluent-check/fluent-check/issues/452)

## Why

FluentCheck's current shrinking implementation returns new `Arbitrary<A>` instances when `shrink()` is called. While elegant, this approach can become expensive for deeply nested data structures:

1. **Eager Materialization**: When shrinking tuples or records, each element position creates a new union of arbitraries, potentially causing combinatorial explosion
2. **Memory Pressure**: Complex nested types (e.g., `Array<Record<{items: Array<string>}>>`) generate large intermediate shrink trees
3. **Timeout Issues**: [#138](https://github.com/fluent-check/fluent-check/issues/138) documents shrinking mapped tuples sometimes failing with timeout
4. **Wasted Computation**: Many shrink candidates are generated but never tested if an earlier candidate already produces a smaller counterexample

A lazy, generator-based approach would compute shrink candidates on-demand, reducing memory usage and improving performance for complex types.

## What Changes

- **Refactor `shrink()` signature** from returning `Arbitrary<A>` to returning `Iterable<FluentPick<A>>` (or a generator)
- **Use generator functions** (`function*` with `yield`) for lazy computation
- **Compose shrink streams** using `yield*` for nested types
- **Update strategy mixins** to consume shrink iterators incrementally
- **Preserve backward compatibility** with existing arbitrary implementations

### Technical Approach

Replace:
```typescript
shrink<B extends A>(initial: FluentPick<B>): Arbitrary<A>
```

With:
```typescript
*shrink<B extends A>(initial: FluentPick<B>): Generator<FluentPick<A>>
```

Example for `ArbitraryInteger`:
```typescript
// Current (eager)
shrink(initial: FluentPick<number>): Arbitrary<number> {
  if (initial.value > 0) {
    return fc.integer(Math.max(0, this.min), initial.value - 1)
  }
  return NoArbitrary
}

// Proposed (lazy)
*shrink(initial: FluentPick<number>): Generator<FluentPick<number>> {
  if (initial.value > 0) {
    // Binary search toward zero
    for (let candidate = 0; candidate <= initial.value - 1; ) {
      yield { value: candidate, original: candidate }
      candidate = Math.ceil((candidate + initial.value) / 2)
    }
  }
}
```

Example for `ArbitraryTuple`:
```typescript
// Current (eager) - creates union of N arbitraries
shrink(initial: FluentPick<A>): Arbitrary<A> {
  return fc.union(...this.arbitraries.map((_, selected) =>
    fc.tuple(...this.arbitraries.map((arbitrary, i) =>
      selected === i ? arbitrary.shrink(pick[i]) : fc.constant(value[i])
    ))))
}

// Proposed (lazy) - yields candidates one at a time
*shrink(initial: FluentPick<A>): Generator<FluentPick<A>> {
  for (let i = 0; i < this.arbitraries.length; i++) {
    for (const shrunkElement of this.arbitraries[i].shrink(picks[i])) {
      yield { 
        value: [...values.slice(0, i), shrunkElement.value, ...values.slice(i + 1)],
        original: [...originals.slice(0, i), shrunkElement.original, ...originals.slice(i + 1)]
      }
    }
  }
}
```

## Impact

- **Affected specs**: `specs/shrinking/spec.md`
- **Affected code**: 
  - `src/arbitraries/Arbitrary.ts` (base class signature)
  - All `Arbitrary*` subclasses with custom `shrink()` implementations
  - `src/strategies/FluentStrategyMixins.ts` (Shrinkable mixin)
  - `src/strategies/FluentStrategy.ts` (shrink consumption)
- **Breaking change**: Yes - `shrink()` return type changes

## Complexity Estimate

**Medium-High Complexity** (2-3 days of focused work)

| Component | Effort | Notes |
|-----------|--------|-------|
| Base `Arbitrary.shrink()` signature | Low | Simple type change |
| `ArbitraryInteger.shrink()` | Low | Straightforward binary search generator |
| `ArbitraryArray.shrink()` | Medium | Must handle length + element shrinking |
| `ArbitraryTuple.shrink()` | Medium | Compose element shrink streams |
| `ArbitraryRecord.shrink()` | Medium | Similar to tuple |
| `MappedArbitrary.shrink()` | Medium | Must handle inverse mapping |
| `FilteredArbitrary.shrink()` | Medium | Filter invalid shrink candidates |
| Strategy integration | Medium | Change from collection to iterator consumption |
| Test updates | Medium | Update existing shrink tests |

**Risk factors**:
- Generator semantics differ from arbitrary semantics (single-use vs reusable)
- Need to handle early termination gracefully
- May need to provide a way to "reify" generators back to arbitraries for caching

## Success Criteria

1. All existing shrinking tests pass
2. [#138](https://github.com/fluent-check/fluent-check/issues/138) timeout issue is resolved
3. Memory usage for shrinking nested types is measurably reduced
4. Shrinking performance for complex types improves by >50%

## Related Issues

- [#434](https://github.com/fluent-check/fluent-check/issues/434) - Research: Integrated Shrinking Approach (Hypothesis/Hedgehog)
- [#138](https://github.com/fluent-check/fluent-check/issues/138) - Shrinking mapped tuples sometimes fails with timeout
- [#18](https://github.com/fluent-check/fluent-check/issues/18) - Should shrink perform exhaustive search by default?
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Profile Performance Hotspots (baseline report)

## Non-Goals

- Implementing integrated shrinking (Hypothesis-style) - that's a separate, larger effort
- Changing the shrinking algorithm itself (e.g., binary search vs linear)
- Adding shrink memoization/caching (potential follow-up)
