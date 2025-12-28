# Change: Lazy Iterator-Based Shrink Candidate Generation

> **Phase**: 1 of 3 (Lazy Shrinking Architecture)
> **Related Phases**: Phase 2: Choice Shrinking for Dependent Generators, Phase 3: Full Choice-Based Migration

## Why

The current shrinking architecture pre-samples 100 candidates from each quantifier's shrink space before testing:

```typescript
// src/strategies/Shrinker.ts:249
const candidates = quantifier.shrink(pick, sampler, Math.min(remaining, 100))
```

This design has several limitations documented in `docs/evidence/shrinking-strategies-comparison.md`:

1. **Prevents true binary search**: Even with weighted 80/20 sampling, the 100 samples are random within buckets. True binary search requires O(log N) deterministic steps, but random sampling cannot guarantee finding the optimal shrink path.

2. **Breaks fair strategies**: Round-Robin and Delta-Debugging try to distribute budget fairly across quantifiers, but each only gets ~100 random samples per round with no memory of previous attempts.

3. **Logarithmic vs linear budget requirements**: Shrinking from 10M to 10 requires ~23 binary search steps. With 5 quantifiers, ~115 successful shrinks minimum. Budget of 2000 random samples still leaves positions 3-5 millions away from optimal.

4. **Unnecessary computation**: Pre-sampling 100 candidates eagerly even when only 1-2 are needed wastes cycles.

### Evidence

From `docs/evidence/shrinking-strategies-comparison.md`:
- Budget=100: Best strategy achieves only 62.5% distance reduction
- Budget=2000: Only positions 1-2 converge to optimal; position 3 still ~118K away
- With true binary search, 115 steps should converge all 5 positions

## What Changes

Replace eager pre-sampling with lazy iterator-based generation that supports systematic binary search:

### Current Architecture

```
arbitrary.shrink(pick) → Arbitrary<A>
sampler.sample(shrinkArb, 100) → FluentPick<A>[]  // Eager, random
for (candidate of candidates) { test(candidate) }
```

### Proposed Architecture

```
arbitrary.shrinkIterator(pick) → Iterator<FluentPick<A>>  // Lazy, systematic
for (candidate of shrinkIterator) {
  if (test(candidate)) {
    shrinkIterator.acceptSmaller()  // Focus search on smaller values
  } else {
    shrinkIterator.rejectSmaller()  // Focus search on larger values
  }
}
```

### Technical Approach

1. **New `ShrinkIterator<A>` interface**:
   ```typescript
   interface ShrinkIterator<A> extends Iterator<FluentPick<A>> {
     // Signal that the last candidate was accepted (property still failed)
     acceptSmaller(): void
     // Signal that the last candidate was rejected (property passed)
     rejectSmaller(): void
     // Get current search bounds for diagnostics
     getBounds(): { lower: A, upper: A }
   }
   ```

2. **Lazy `shrinkIterator()` method on Arbitrary**:
   ```typescript
   abstract class Arbitrary<A> {
     // Existing eager method (preserved for backward compatibility)
     shrink<B extends A>(initial: FluentPick<B>): Arbitrary<A>

     // New lazy method with binary search support
     *shrinkIterator(initial: FluentPick<A>): ShrinkIterator<A>
   }
   ```

3. **Binary search implementation for integers**:
   ```typescript
   class ArbitraryInteger {
     *shrinkIterator(initial: FluentPick<number>): ShrinkIterator<number> {
       let lower = this.target  // e.g., 0
       let upper = initial.value
       let lastAccepted = false

       while (lower < upper) {
         const mid = Math.floor((lower + upper) / 2)
         const pick = { value: mid, original: initial.original }

         yield pick

         if (lastAccepted) {
           upper = mid  // Focus on smaller half
         } else {
           lower = mid + 1  // Focus on larger half
         }
       }
     }
   }
   ```

4. **Modified Shrinker to use iterators**:
   ```typescript
   class PerArbitraryShrinker {
     #shrinkQuantifier(quantifier, current, budget) {
       const iterator = quantifier.shrinkIterator(current[key])

       for (const candidate of iterator) {
         if (attempts >= budget.maxAttempts) break
         attempts++

         if (this.testCandidate(candidate)) {
           iterator.acceptSmaller()  // Guide next iteration
           return candidate
         } else {
           iterator.rejectSmaller()
         }
       }
       return null
     }
   }
   ```

### Backward Compatibility

- Existing `shrink()` method preserved
- Default `shrinkIterator()` implementation wraps `shrink()` for arbitraries that don't implement it
- `ExecutableQuantifier` interface extended with optional `shrinkIterator` method

## Impact

- **Affected specs**: `specs/shrinking/spec.md`, `specs/strategies/spec.md`
- **Affected code**:
  - `src/arbitraries/Arbitrary.ts` - Add `ShrinkIterator` interface and `shrinkIterator()` method
  - `src/arbitraries/ArbitraryInteger.ts` - Implement binary search iterator
  - `src/arbitraries/ArbitraryArray.ts` - Implement lazy length/element shrinking
  - `src/arbitraries/ArbitraryTuple.ts` - Implement interleaved lazy shrinking
  - `src/strategies/Shrinker.ts` - Use iterators instead of pre-sampling
  - `src/ExecutableScenario.ts` - Add `shrinkIterator` to `ExecutableQuantifier`
- **Breaking change**: No - existing `shrink()` behavior preserved
- **Performance**: Significant improvement for large value ranges

## Complexity Estimate

**High Complexity** (3-5 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| `ShrinkIterator` interface | Low | Type definitions |
| `Arbitrary.shrinkIterator()` default | Low | Wrap existing shrink() |
| `ArbitraryInteger.shrinkIterator()` | Medium | Binary search with feedback |
| `ArbitraryArray.shrinkIterator()` | Medium | Lazy length + elements |
| `ArbitraryTuple.shrinkIterator()` | Medium | Interleaved iteration |
| `PerArbitraryShrinker` refactor | High | Core algorithm change |
| `ExecutableQuantifier` extension | Low | Interface addition |
| Evidence study | Medium | Validate improvement |
| Test updates | Medium | New iterator tests |

## Success Criteria

1. **Binary search convergence**: Integer shrinking from 10M to 10 converges in ~23 steps
2. **Fair strategy effectiveness**: Round-Robin with 500 budget converges all 5 positions to optimal
3. **Backward compatibility**: All existing shrinking tests pass unchanged
4. **Performance**: No regression in simple cases; major improvement for large ranges
5. **Evidence**: Study shows 90%+ distance reduction vs current 62.5%

## Open Questions

1. **Iterator protocol**: Should we use standard `Iterator` or custom protocol for `acceptSmaller()`/`rejectSmaller()`?
2. **Fallback strategy**: When binary search rejects all candidates in smaller half, how to recover?
3. **Composite arbitraries**: How should mapped/filtered arbitraries wrap the iterator?

## Related Changes

- Correlates with `add-shrink-interleaving` (interleaved element shrinking)
- Foundation for Phase 2: Choice Shrinking for Dependent Generators
- Foundation for Phase 3: Full Choice-Based Migration
