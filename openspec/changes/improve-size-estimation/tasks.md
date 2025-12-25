# Tasks: Improve Size Estimation

## 1. Implementation

- [ ] 1.1 Add `estimateSize(sampler, budget)` to `Arbitrary` class (base implementation calls `size()`).
- [ ] 1.2 Implement `estimateSize` in `FilterArbitrary` using Monte Carlo sampling.
- [ ] 1.3 Implement `estimateSize` in `MappedArbitrary` (optional/stretch: detect collisions).
- [ ] 1.4 Update `oneof` and `frequency` to call `estimateSize` during initialization (or lazy init).

## 2. Validation

- [ ] 2.1 Create unit test `test/size-estimation.test.ts` verifying accuracy for filters.
- [ ] 2.2 Re-run `scripts/evidence/filter-cascade.study.ts` (modified to check new behavior) to verify error reduction.
- [ ] 2.3 Run `npx openspec validate improve-size-estimation --strict`.
