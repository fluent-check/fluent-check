# Tasks: Fix Weighted Union Fairness

## 1. Investigation & Implementation

- [ ] 1.1 Review `src/arbitraries/index.ts` (frequency implementation) for potential bias sources.
- [ ] 1.2 Implement "Robust Selection" logic (integer-based, rejection sampling if needed) in a temporary branch/file.
- [ ] 1.3 Verify the fix using `scripts/evidence/weighted-union.study.ts`.

## 2. Integration

- [ ] 2.1 Refactor `frequency` arbitrary to use the new selection logic.
- [ ] 2.2 Refactor `oneof` if it shares the same underlying mechanism.

## 3. Validation

- [ ] 3.1 Run `npm run evidence:weighted-union` and verify `p > 0.05` for the 1:99 case.
- [ ] 3.2 Run `npm test` to ensure no regressions.
- [ ] 3.3 Run `npx openspec validate fix-weighted-union-fairness --strict`.
