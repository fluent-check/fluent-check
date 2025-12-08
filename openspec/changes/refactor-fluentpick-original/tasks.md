## 1. Core Type Redefinition

- [ ] 1.1 Update `FluentPick` in `src/arbitraries/types.ts` to `FluentPick<V, Original = V>`
- [ ] 1.2 Add `MappedPick`, `PickValue`, and `PickOriginal` helpers
- [ ] 1.3 Run `npm run test:types` to ensure no accidental regressions

## 2. Generalize Arbitrary API

- [ ] 2.1 Make `Arbitrary` generic as `Arbitrary<V, Original = V>` in `src/arbitraries/Arbitrary.ts`
- [ ] 2.2 Update `pick` and `canGenerate` signatures to use `FluentPick<V, Original>`
- [ ] 2.3 Update `shrink` default implementation to preserve `Original`
- [ ] 2.4 Adjust `map`, `filter`, and `chain` signatures to propagate `Original` correctly
- [ ] 2.5 Run `npm run test:types` and `npm test` to verify behavior

## 3. Update Primitive and Composite Arbitraries

- [ ] 3.1 Update all primitive arbitraries (`ArbitraryInteger`, `ArbitraryReal`, `ArbitraryBoolean`, etc.) to extend `Arbitrary<V>` (relying on default `Original = V`)
- [ ] 3.2 Update composite arbitraries (`ArbitraryArray`, `ArbitraryTuple`, `ArbitraryRecord`, `ArbitrarySet`) to construct `FluentPick` with appropriate `Original` types
- [ ] 3.3 For composites where `Original` is not yet precisely tracked, treat it as `unknown` and document TODOs
- [ ] 3.4 Run `npm test` to ensure existing property tests still pass

## 4. Update Mapped and Chained Arbitraries

- [ ] 4.1 Refactor `MappedArbitrary<A, B>` to extend `Arbitrary<B, A>`
- [ ] 4.2 Ensure `mapFluentPick`, `pick`, `cornerCases`, `shrink`, and `canGenerate` all use `FluentPick<B, A>`
- [ ] 4.3 Update `ChainedArbitrary<A, B>` so that it respects the `Original` type of the chained arbitrary
- [ ] 4.4 Run `npm run test:types` and targeted shrinking tests to validate correctness

## 5. Integrate with FluentCheck and Laws

- [ ] 5.1 Update any `FluentCheck` or `FluentResult` helpers that construct `FluentPick` literals to include `Original` where appropriate (or rely on defaults)
- [ ] 5.2 Ensure law tests in `src/arbitraries/laws.ts` remain type-correct with the new `FluentPick` shape
- [ ] 5.3 Run the full test suite (`npm test`) and type tests (`npm run test:types`)

## 6. Documentation

- [ ] 6.1 Update `docs/chained-type-inference.md` with a section on `FluentPick<V, Original>` and provenance
- [ ] 6.2 Add an example showing how `Original` flows through `map` and `shrink`
- [ ] 6.3 If needed, add brief notes to `specs/arbitraries/spec.md` and `specs/shrinking/spec.md` describing original type tracking

## 7. Verification and Cleanup

- [ ] 7.1 Run `npm run lint` to ensure no new lint issues are introduced
- [ ] 7.2 Review remaining uses of `original?: any` or `FluentPick<...>` without `Original` and add TODOs or tighten types where safe
- [ ] 7.3 Confirm no changes are required to public APIs (exports from `src/index.ts`)

