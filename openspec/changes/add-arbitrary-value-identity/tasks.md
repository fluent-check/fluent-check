# Tasks: Add Value Identity Functions to Arbitrary

## 1. Core Infrastructure

- [ ] 1.1 Add `hashCode(): (a: A) => number` method to `Arbitrary<A>` base class with stringify fallback
- [ ] 1.2 Add `equals(): (a: A, b: A) => boolean` method to `Arbitrary<A>` base class with stringify fallback
- [ ] 1.3 Add hash mixing utility function (`mix`) to `src/arbitraries/util.ts`
- [ ] 1.4 Add `doubleToHash` utility for floating-point values
- [ ] 1.5 Add `stringToHash` utility for string values (FNV-1a or similar)

## 2. Primitive Arbitrary Implementations

- [ ] 2.1 Override `hashCode`/`equals` in `ArbitraryInteger` (identity hash, `===` equals)
- [ ] 2.2 Override `hashCode`/`equals` in `ArbitraryReal` (double-to-hash, `Object.is` equals)
- [ ] 2.3 Override `hashCode`/`equals` in `ArbitraryBoolean` (trivial `0`/`1` hash, `===` equals)
- [ ] 2.4 Override `hashCode`/`equals` in `ArbitraryConstant` (constant hash, reference equals)

## 3. Composite Arbitrary Implementations

- [ ] 3.1 Override `hashCode`/`equals` in `ArbitraryArray` (compose element identity)
- [ ] 3.2 Override `hashCode`/`equals` in `ArbitraryTuple` (compose element identity)
- [ ] 3.3 Override `hashCode`/`equals` in `ArbitraryRecord` (compose property identity)
- [ ] 3.4 Override `hashCode`/`equals` in `ArbitrarySet` (compose element identity, order-independent)

## 4. Derived Arbitrary Implementations

- [ ] 4.1 Override `hashCode`/`equals` in `FilteredArbitrary` (delegate to base)
- [ ] 4.2 Override `hashCode`/`equals` in `ArbitraryComposite` (union - use fallback or first arbitrary's identity)
- [ ] 4.3 Verify `MappedArbitrary` and `ChainedArbitrary` use fallback (no override needed)

## 5. Integration

- [ ] 5.1 Update `sampleUnique()` to use `hashCode()`/`equals()` for deduplication
- [ ] 5.2 Verify `sampleUniqueWithBias()` uses the updated `sampleUnique()`

## 6. Testing

- [ ] 6.1 Add unit tests for hash/equals on primitive arbitraries
- [ ] 6.2 Add unit tests for hash/equals on composite arbitraries
- [ ] 6.3 Add tests verifying `sampleUnique()` deduplication correctness
- [ ] 6.4 Add tests for edge cases: NaN, -0, empty arrays, nested structures
- [ ] 6.5 Add tests for fallback behavior (MappedArbitrary, ChainedArbitrary)

## 7. Validation

- [ ] 7.1 Run existing test suite to verify no regressions
- [ ] 7.2 Run `openspec validate add-arbitrary-value-identity --strict`
