# Tasks: Optimize Collection Lengths

## 1. Implementation

- [ ] 1.1 Create `src/arbitraries/util.ts` helper `sampleLength(min, max, biasConfig?)`.
- [ ] 1.2 Update `src/arbitraries/ArrayArbitrary.ts` to use `sampleLength`.
- [ ] 1.3 Update `src/arbitraries/StringArbitrary.ts` to use `sampleLength`.
- [ ] 1.4 Update other collection arbitraries (`SetArbitrary`, `MapArbitrary`) if applicable.

## 2. Validation

- [ ] 2.1 Create unit test `test/length-bias.test.ts` verifying distribution frequencies (chi-squared or simple bucket count).
- [ ] 2.2 Verify `npm test` passes.
- [ ] 2.3 Run `npx openspec validate optimize-collection-lengths --strict`.
