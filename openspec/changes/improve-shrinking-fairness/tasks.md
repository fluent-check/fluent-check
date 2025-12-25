# Tasks: Improve Shrinking Fairness

## 1. Implementation

- [ ] 1.1 Create `src/strategies/InterleavedShrinker.ts` implementing `Shrinker` (or refactor `PerArbitraryShrinker` to support modes).
  - Implement the round-robin logic.
- [ ] 1.2 Update `src/strategies/FluentStrategyFactory.ts` to add `withShrinkingStrategy(mode)` method.
- [ ] 1.3 Update `src/strategies/FluentStrategyFactory.ts` `buildShrinker()` to return the correct shrinker.
- [ ] 1.4 Export new types/modes in `src/index.ts`.

## 2. Validation

- [ ] 2.1 Create unit test `test/shrinking-fairness.test.ts` verifying `(a + b > K)` reduces to balanced values.
- [ ] 2.2 Verify `npm test` passes.
- [ ] 2.3 Run `npx openspec validate improve-shrinking-fairness --strict`.
