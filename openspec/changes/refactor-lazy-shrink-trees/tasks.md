# Tasks: Refactor Lazy Shrink Trees

## 1. Research and Preparation

- [ ] 1.1 Review existing shrink implementations in all Arbitrary subclasses
- [ ] 1.2 Document current shrink behavior with test coverage
- [ ] 1.3 Create benchmark suite for shrinking performance (before metrics)
- [ ] 1.4 Study Hypothesis/Hedgehog shrinking approaches for insights

## 2. Core Infrastructure

- [ ] 2.1 Update `Arbitrary.shrink()` signature to return `Generator<FluentPick<A>>`
- [ ] 2.2 Add `shrinkToArbitrary()` adapter method for backward compatibility
- [ ] 2.3 Update `NoArbitrary` to return empty generator
- [ ] 2.4 Add utility functions for generator composition (`interleave`, `take`, etc.)

## 3. Primitive Arbitraries

- [ ] 3.1 Refactor `ArbitraryInteger.shrink()` to binary search generator
- [ ] 3.2 Refactor `ArbitraryReal.shrink()` to binary search generator
- [ ] 3.3 Refactor `ArbitraryBoolean.shrink()` (trivial - just false then true)
- [ ] 3.4 Add tests for primitive shrink generators

## 4. Collection Arbitraries

- [ ] 4.1 Refactor `ArbitraryArray.shrink()` to generator (length + elements)
- [ ] 4.2 Refactor `ArbitrarySet.shrink()` to generator
- [ ] 4.3 Refactor `ArbitraryTuple.shrink()` to interleaved generator
- [ ] 4.4 Refactor `ArbitraryRecord.shrink()` to interleaved generator
- [ ] 4.5 Add tests for collection shrink generators

## 5. Composite Arbitraries

- [ ] 5.1 Refactor `MappedArbitrary.shrink()` to generator with inverse mapping
- [ ] 5.2 Refactor `FilteredArbitrary.shrink()` to generator with predicate filtering
- [ ] 5.3 Refactor `ChainedArbitrary.shrink()` to generator
- [ ] 5.4 Refactor `ArbitraryComposite.shrink()` (union) to interleaved generator
- [ ] 5.5 Add tests for composite shrink generators

## 6. Strategy Integration

- [ ] 6.1 Update `StrategyArbitraries` type to include shrink iterator
- [ ] 6.2 Refactor `Shrinkable` mixin to consume generators lazily
- [ ] 6.3 Update `hasInput` to pull from shrink iterator on demand
- [ ] 6.4 Add tests for strategy shrink integration

## 7. String and Regex Arbitraries

- [ ] 7.1 Refactor string arbitrary shrinking to generator
- [ ] 7.2 Refactor regex arbitrary shrinking to generator
- [ ] 7.3 Add tests for string/regex shrink generators

## 8. Testing and Validation

- [ ] 8.1 Run full test suite, fix any regressions
- [ ] 8.2 Verify [#138](https://github.com/fluent-check/fluent-check/issues/138) timeout issue is resolved
- [ ] 8.3 Run benchmark suite (after metrics)
- [ ] 8.4 Verify memory usage improvement with profiling
- [ ] 8.5 Test with deeply nested types (5+ levels)

## 9. Documentation and Cleanup

- [ ] 9.1 Update API documentation for new shrink signature
- [ ] 9.2 Add migration guide for custom arbitrary implementations
- [ ] 9.3 Update CONTRIBUTING.md with shrinking guidelines
- [ ] 9.4 Add examples of custom shrink generators to docs
