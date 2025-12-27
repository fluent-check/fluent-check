# Tasks: Add Adaptive Deduplication

## 1. Implementation

- [ ] 1.1 Update `src/strategies/FluentStrategyFactory.ts` to add configuration `adaptiveDeduplication` (default true).
- [ ] 1.2 Update `src/strategies/Explorer.ts` (or `AbstractExplorer`) `generateSamples` method.
  - Add logic: `if (config.adaptiveDedup && arb.size().value < count * threshold) use sampleUnique`.
- [ ] 1.3 Ensure `DedupingSampler` or `Arbitrary.sampleUnique` handles exhaustion gracefully (stops when full).

## 2. Validation

- [ ] 2.1 Create unit test `test/adaptive-dedup.test.ts` verifying it triggers for small domains.
- [ ] 2.2 Verify it DOES NOT trigger for large domains.
- [ ] 2.3 Run `npx openspec validate add-adaptive-deduplication --strict`.
