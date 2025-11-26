## 1. Investigation

- [x] 1.1 Review `given()` method signature in `src/FluentCheck.ts:31`
- [x] 1.2 Review `and()` method signature in `src/FluentCheck.ts:113`
- [x] 1.3 Review `map()` method signature in `src/arbitraries/Arbitrary.ts:119`
- [x] 1.4 Document current inference behavior with concrete examples
- [x] 1.5 Identify cases where inference produces unexpected results
- [x] 1.6 Evaluate impact of `NoInfer<T>` on developer experience for each candidate
- [x] 1.7 Create comprehensive analysis in `analysis.md`

## 2. Type-Level Testing Setup

- [ ] 2.1 Create type-level test file `test/types/noinfer.test.ts`
- [ ] 2.2 Add test cases verifying current inference behavior (baseline)
- [ ] 2.3 Use `@ts-expect-error` and type assertions to verify inference changes

## 3. Implementation

- [ ] 3.1 Apply `NoInfer<V>` to `given()` method if beneficial
- [ ] 3.2 Apply `NoInfer<V>` to `and()` method in `FluentCheckGiven` class
- [ ] 3.3 Apply `NoInfer<B>` to `map()` shrinkHelper parameter if beneficial
- [ ] 3.4 Review factory functions in `src/arbitraries/index.ts` for additional candidates
- [ ] 3.5 Apply `NoInfer<T>` to other identified candidates

## 4. Validation

- [ ] 4.1 Run full test suite to ensure no runtime regressions
- [ ] 4.2 Verify type-level tests pass with new inference behavior
- [ ] 4.3 Verify TypeScript version supports `NoInfer<T>` (requires TS 5.4+) ✓
- [ ] 4.4 Test common usage patterns from `test/stack.test.ts` still compile
- [ ] 4.5 Document any breaking changes in behavior

## 5. Documentation

- [ ] 5.1 Update JSDoc comments to explain inference behavior
- [ ] 5.2 Add inline comments explaining `NoInfer` usage rationale
