## 1. Implementation

- [ ] 1.1 Define `ExactSize` and `EstimatedSize` types in `src/arbitraries/types.ts`
- [ ] 1.2 Update `ArbitrarySize` to be a discriminated union of the new types
- [ ] 1.3 Create helper functions `exactSize(value)` and `estimatedSize(value, interval)`
- [ ] 1.4 Update `ArbitraryInteger.size()` to return `ExactSize`
- [ ] 1.5 Update `ArbitraryReal.size()` to return `ExactSize`
- [ ] 1.6 Update `FilteredArbitrary.size()` to return `EstimatedSize`
- [ ] 1.7 Update all other `size()` implementations
- [ ] 1.8 Update consumers of `ArbitrarySize` to use discriminated union narrowing
- [ ] 1.9 Add exhaustive switch statements with `never` checks where appropriate
- [ ] 1.10 Run full test suite to ensure no regressions
