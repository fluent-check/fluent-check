# Tasks: Add Value Identity Functions to Arbitrary

## 1. Core Infrastructure

- [x] 1.1 Add `hashCode(): (a: A) => number` method to `Arbitrary<A>` base class with stringify fallback
- [x] 1.2 Add `equals(): (a: A, b: A) => boolean` method to `Arbitrary<A>` base class with stringify fallback
- [x] 1.3 Add hash mixing utility function (`mix`) to `src/arbitraries/util.ts`
- [x] 1.4 Add `doubleToHash` utility for floating-point values
- [x] 1.5 Add `stringToHash` utility for string values (FNV-1a or similar)

## 2. Primitive Arbitrary Implementations

- [x] 2.1 Override `hashCode`/`equals` in `ArbitraryInteger` (identity hash, `===` equals)
- [x] 2.2 Override `hashCode`/`equals` in `ArbitraryReal` (double-to-hash, `Object.is` equals)
- [x] 2.3 Override `hashCode`/`equals` in `ArbitraryBoolean` (trivial `0`/`1` hash, `===` equals)
- [x] 2.4 Override `hashCode`/`equals` in `ArbitraryConstant` (constant hash, reference equals)

## 3. Composite Arbitrary Implementations

- [x] 3.1 Override `hashCode`/`equals` in `ArbitraryArray` (compose element identity)
- [x] 3.2 Override `hashCode`/`equals` in `ArbitraryTuple` (compose element identity)
- [x] 3.3 Override `hashCode`/`equals` in `ArbitraryRecord` (compose property identity)
- [x] 3.4 Override `hashCode`/`equals` in `ArbitrarySet` (compose element identity, order-independent)

## 4. Derived Arbitrary Implementations

- [x] 4.1 Override `hashCode`/`equals` in `FilteredArbitrary` (delegate to base)
- [x] 4.2 Override `hashCode`/`equals` in `ArbitraryComposite` (union - use fallback or first arbitrary's identity)
- [x] 4.3 Verify `MappedArbitrary` and `ChainedArbitrary` use fallback (no override needed)

## 5. Integration

- [x] 5.1 Update `sampleUnique()` to use `hashCode()`/`equals()` for deduplication
- [x] 5.2 Verify `sampleUniqueWithBias()` uses the updated `sampleUnique()`

## 6. Testing

- [x] 6.1 Add unit tests for hash/equals on primitive arbitraries
- [x] 6.2 Add unit tests for hash/equals on composite arbitraries
- [x] 6.3 Add tests verifying `sampleUnique()` deduplication correctness
- [x] 6.4 Add tests for edge cases: NaN, -0, empty arrays, nested structures
- [x] 6.5 Add tests for fallback behavior (MappedArbitrary, ChainedArbitrary)

## 7. Validation

- [x] 7.1 Run existing test suite to verify no regressions
- [x] 7.2 Run `openspec validate add-arbitrary-value-identity --strict`
