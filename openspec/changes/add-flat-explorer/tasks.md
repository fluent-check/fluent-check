# Tasks: Add Flat Random Explorer

## 1. Implementation

- [ ] 1.1 Create `src/strategies/FlatExplorer.ts` extending `AbstractExplorer`.
  - Implement `quantifierSemantics` that creates fresh samples for every iteration.
  - Or simpler: Implement `explore` directly to bypass the recursive structure if it's cleaner (Flat is just a loop).
  - Ensure it respects `maxTests` budget.
  - Ensure it handles `precondition` failures (discard and retry).
- [ ] 1.2 Update `src/strategies/FluentStrategyFactory.ts` to add `withRandomExploration()` method and configuration flag.
- [ ] 1.3 Update `src/strategies/FluentStrategyFactory.ts` `buildExplorer()` to return `FlatExplorer` when configured.
- [ ] 1.4 Export `FlatExplorer` in `src/strategies/Explorer.ts` and `src/index.ts`.

## 2. Validation

- [ ] 2.1 Create unit test `test/flat-explorer.test.ts` verifying:
  - It runs the requested number of tests.
  - It respects preconditions.
  - It finds bugs in simple scenarios.
- [ ] 2.2 Create integration test `test/flat-diversity.test.ts` (or reuse Study 5.3 logic) to verify effective sample size is $N$ (not $N^{1/d}$).
- [ ] 2.3 Verify `npm test` passes.
- [ ] 2.4 Run `npx openspec validate add-flat-explorer --strict`.
