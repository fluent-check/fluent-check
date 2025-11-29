## 1. Implementation

- [ ] 1.1 Add abstract `enumerate(): Iterable<A> | null` method to base Arbitrary
- [ ] 1.2 Implement `enumerate()` for `ArbitraryInteger`
- [ ] 1.3 Implement `enumerate()` for `ArbitraryBoolean`
- [ ] 1.4 Implement `enumerate()` for `ConstantArbitrary`
- [ ] 1.5 Implement `enumerate()` for `OneOfArbitrary` (union of enumerables)
- [ ] 1.6 Implement `enumerate()` for `ArbitraryTuple` (cross product)
- [ ] 1.7 Handle `MappedArbitrary` enumeration (map over base enumeration)
- [ ] 1.8 Handle `FilteredArbitrary` enumeration (filter base enumeration)

## 2. Strategy Integration

- [ ] 2.1 Add `withExhaustive(enabled: boolean)` to `FluentStrategyFactory`
- [ ] 2.2 Add `withExhaustiveThreshold(size: number)` to `FluentStrategyFactory`
- [ ] 2.3 Modify strategy to use enumeration when appropriate
- [ ] 2.4 Handle multi-arbitrary scenarios (enumerate smallest, sample rest)

## 3. Testing

- [ ] 3.1 Test enumeration correctness for each arbitrary type
- [ ] 3.2 Test auto-detection based on size threshold
- [ ] 3.3 Test fallback to sampling for large/non-enumerable arbitraries
- [ ] 3.4 Test determinism of exhaustive mode
- [ ] 3.5 Benchmark enumeration vs sampling for small domains

## 4. Documentation

- [ ] 4.1 Document exhaustive mode in API docs
- [ ] 4.2 Add examples for when to use exhaustive generation
