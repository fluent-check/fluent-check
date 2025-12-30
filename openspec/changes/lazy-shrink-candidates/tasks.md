# Tasks: Lazy Iterator-Based Shrink Candidate Generation

## Implementation Tasks

### 1. Define ShrinkIterator Interface
- [ ] Create `ShrinkIterator<A>` interface in `src/arbitraries/types.ts`
- [ ] Define `acceptSmaller()` and `rejectSmaller()` methods
- [ ] Define `getBounds()` method for diagnostics
- [ ] Export from arbitraries index

### 2. Add Default shrinkIterator to Arbitrary Base Class
- [ ] Add `shrinkIterator()` method to `Arbitrary` base class
- [ ] Implement default that wraps `shrink()` with random sampling
- [ ] Ensure backward compatibility for arbitraries without custom iterators

### 3. Implement Binary Search Iterator for ArbitraryInteger
- [ ] Implement `shrinkIterator()` with binary search logic
- [ ] Track lower/upper bounds based on feedback
- [ ] Handle edge cases: negative numbers, target at boundary
- [ ] Optimize for weighted 80/20 when no feedback provided

### 4. Implement Lazy Shrinking for ArbitraryArray
- [ ] Implement `shrinkIterator()` for length shrinking
- [ ] Implement interleaved element shrinking
- [ ] Combine length and element iterators
- [ ] Handle empty array edge case

### 5. Implement Lazy Shrinking for ArbitraryTuple
- [ ] Implement `shrinkIterator()` with round-robin interleaving
- [ ] Track per-position iterators and their feedback
- [ ] Handle heterogeneous element types

### 6. Extend ExecutableQuantifier
- [ ] Add optional `shrinkIterator` method to interface
- [ ] Update `compileQuantifier()` to include iterator
- [ ] Preserve backward compatibility

### 7. Refactor PerArbitraryShrinker
- [ ] Add iterator-based shrinking path
- [ ] Implement feedback loop with `acceptSmaller()`/`rejectSmaller()`
- [ ] Fall back to eager shrinking when iterator unavailable
- [ ] Update budget tracking for lazy evaluation

### 8. Update Shrink Round Strategies
- [ ] Ensure Round-Robin works with iterators
- [ ] Ensure Delta-Debugging works with iterators
- [ ] Maintain iterator state across rounds

## Testing Tasks

### 9. Unit Tests for ShrinkIterator
- [ ] Test binary search convergence for integers
- [ ] Test feedback mechanism
- [ ] Test bounds tracking
- [ ] Test edge cases (single value, already at target)

### 10. Integration Tests
- [ ] Test full shrinking pipeline with iterators
- [ ] Compare results with eager shrinking
- [ ] Test composite arbitraries (mapped, filtered)
- [ ] Test nested quantifiers

### 11. Evidence Study
- [ ] Update `shrinking-strategies-comparison.study.ts` for iterators
- [ ] Run comparison: iterator vs eager sampling
- [ ] Measure convergence rate improvements
- [ ] Document results in evidence file

## Documentation Tasks

### 12. Update API Documentation
- [ ] Document `ShrinkIterator` interface
- [ ] Document `shrinkIterator()` method
- [ ] Add examples of custom iterator implementation

### 13. Update Research Documents
- [ ] Update `integrated-shrinking.md` with Phase 1 status
- [ ] Link to evidence study results
