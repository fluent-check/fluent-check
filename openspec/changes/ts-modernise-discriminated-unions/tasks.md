## 1. Type Definitions

- [x] 1.1 Define `ExactSize` type in `src/arbitraries/types.ts` with `type: 'exact'` and `value: number`
- [x] 1.2 Define `EstimatedSize` type in `src/arbitraries/types.ts` with `type: 'estimated'`, `value: number`, and `credibleInterval: [number, number]`
- [x] 1.3 Update `ArbitrarySize` to be a discriminated union: `ExactSize | EstimatedSize`
- [x] 1.4 Export `ExactSize` and `EstimatedSize` types for external consumers

## 2. Factory Functions

- [x] 2.1 Create `exactSize(value: number): ExactSize` helper in `src/arbitraries/util.ts`
- [x] 2.2 Create `estimatedSize(value: number, credibleInterval: [number, number]): EstimatedSize` helper in `src/arbitraries/util.ts`
- [x] 2.3 Update `NilArbitrarySize` to use `exactSize(0)` and type as `ExactSize`
- [x] 2.4 Refactor `mapArbitrarySize` to properly handle discriminated unions (return `ExactSize` when both inputs are exact, `EstimatedSize` otherwise)

## 3. Update ExactSize Implementations

- [x] 3.1 Update `ArbitraryInteger.size()` to return `ExactSize` using `exactSize()` helper
- [x] 3.2 Update `ArbitraryConstant.size()` to return `ExactSize` using `exactSize(1)`
- [x] 3.3 Update `NoArbitrary.size()` to return `ExactSize` using `exactSize(0)`
- [x] 3.4 Update `ArbitrarySet.size()` to return `ExactSize` using `exactSize()`
- [x] 3.5 Update `ArbitraryArray.size()` to return `ExactSize` (when base is exact)

## 4. Update EstimatedSize Implementations

- [x] 4.1 Update `FilteredArbitrary.size()` to return `EstimatedSize` using `estimatedSize()` helper

## 5. Update Conditional Implementations

- [x] 5.1 Refactor `ArbitraryTuple.size()` to return discriminated union based on component types
- [x] 5.2 Refactor `ArbitraryComposite.size()` to return discriminated union based on component types

## 6. Update Exports

- [x] 6.1 Update `src/arbitraries/index.ts` to export new types (`ExactSize`, `EstimatedSize`)
- [x] 6.2 Update `src/arbitraries/index.ts` to export factory functions (`exactSize`, `estimatedSize`)

## 7. Consumer Updates

- [x] 7.1 Review `Arbitrary.ts:sampleUnique()` for potential type narrowing improvements
- [x] 7.2 Add exhaustive switch statements with `never` checks where beneficial

## 8. Validation

- [x] 8.1 Run TypeScript compiler to verify all type errors are resolved
- [x] 8.2 Run full test suite (`npm test`) to ensure no runtime regressions
- [x] 8.3 Verify all `size()` implementations compile without type assertions
- [x] 8.4 Check that discriminated union narrowing works correctly in IDE
