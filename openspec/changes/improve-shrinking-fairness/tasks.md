# Tasks: Improve Shrinking Fairness

## Phase 1: Minimal Change (Round-Robin)

### 1.1 Core Implementation

- [ ] 1.1.1 Modify `src/strategies/Shrinker.ts` line 265 to remove the `break` statement that causes sequential bias
  - Change the `#shrinkWithMode` method to continue iterating through all quantifiers per round
  - Expected diff: Remove single `break` statement
- [ ] 1.1.2 Add a flag to `PerArbitraryShrinker` constructor to optionally restore legacy behavior
  - Add optional parameter: `constructor(private legacySequential = false)`
  - Conditionally include `break` based on flag

### 1.2 Configuration Support

- [ ] 1.2.1 Add `ShrinkingStrategy` type to `src/strategies/types.ts`
  ```typescript
  export type ShrinkingStrategy = 'round-robin' | 'sequential-exhaustive'
  ```
- [ ] 1.2.2 Update `FluentStrategyFactory` to accept shrinking strategy
  - Add `withShrinkingStrategy(mode: ShrinkingStrategy)` method
  - Update `buildShrinker()` to pass legacy flag based on mode
- [ ] 1.2.3 Export new types in `src/index.ts`

### 1.3 Testing

- [ ] 1.3.1 Create comprehensive test suite `test/shrinking-fairness.test.ts`
  - Test symmetric property `a + b + c <= 150` with various quantifier orders
  - Verify variance of final values is reduced
  - Compare round-robin vs sequential-exhaustive
  - Test case: Verify `forall(a,b,c)` and `forall(c,b,a)` produce similar results
- [ ] 1.3.2 Add regression test ensuring existing tests still pass
- [ ] 1.3.3 Verify `npm test` passes
- [ ] 1.3.4 Run shrinking fairness study again and verify improved metrics

## Phase 2: Additional Strategies (Optional)

### 2.1 Delta Debugging Shrinker

- [ ] 2.1.1 Create `src/strategies/DeltaDebuggingShrinker.ts` implementing `Shrinker`
  - Implement subset enumeration logic
  - Implement shrinking of multiple quantifiers simultaneously
- [ ] 2.1.2 Add `'delta-debugging'` to `ShrinkingStrategy` union type
- [ ] 2.1.3 Update factory to instantiate `DeltaDebuggingShrinker` when selected
- [ ] 2.1.4 Add performance tests (expect ~60% more attempts)

### 2.2 Documentation

- [ ] 2.2.1 Update `docs/smart-shrinking.md` with fairness discussion
- [ ] 2.2.2 Add migration guide for users relying on lexicographic behavior
- [ ] 2.2.3 Document performance tradeoffs of each strategy
- [ ] 2.2.4 Add examples showing when to use each strategy

## Phase 3: Validation and Release

### 3.1 Evidence-Based Validation

- [ ] 3.1.1 Create shrinking strategies comparison study
  - Implement `scripts/evidence/shrinking-strategies-comparison.study.ts`
  - Test all three strategies: sequential-exhaustive, round-robin, delta-debugging (future)
  - Properties: sum constraint, product constraint, triangle inequality
  - Metrics: variance, attempts, rounds, wall-clock time
  - Output: `docs/evidence/raw/shrinking-strategies.csv`

- [ ] 3.1.2 Create analysis script `analysis/shrinking_strategies_comparison.py`
  - Compute summary statistics per strategy
  - Run ANOVA and Tukey HSD post-hoc tests
  - Calculate variance reduction percentages
  - Test quantifier order independence
  - Generate comparison tables

- [ ] 3.1.3 Generate visualizations
  - Box plot: variance distribution by strategy
  - Bar chart: mean attempts/rounds comparison
  - Scatter plot: fairness vs efficiency trade-off
  - Heatmap: quantifier order effect matrix
  - Output: `docs/evidence/shrinking-strategies-comparison.png`

- [ ] 3.1.4 Validate against benchmarks from `docs/evidence/shrinking-strategies-comparison.md`
  - [ ] Round-Robin variance is 50-80% lower than Sequential Exhaustive
  - [ ] Round-Robin overhead is <10% (attempts and time)
  - [ ] Round-Robin rounds are 20-30% fewer than Sequential Exhaustive
  - [ ] ANOVA shows significant difference (p < 0.05)
  - [ ] All pairwise Tukey HSD comparisons are significant

- [ ] 3.1.5 Re-run Study 14 (Shrinking Fairness) with round-robin enabled
  - Compare new results with original baseline
  - Verify position effect is reduced
  - Update `docs/evidence/README.md` with new results

- [ ] 3.1.6 Document findings
  - Update `docs/evidence/README.md` with strategy comparison section
  - Add statistical conclusions
  - Include visualizations
  - Provide configuration recommendations based on evidence

### 3.2 Breaking Changes Assessment

- [ ] 3.2.1 Identify tests that depend on exact shrunk values
- [ ] 3.2.2 Update or parameterize affected tests
- [ ] 3.2.3 Document any user-facing breaking changes
- [ ] 3.2.4 Add migration notes to CHANGELOG.md

### 3.3 Performance Validation

- [ ] 3.3.1 Run performance benchmarks comparing strategies
- [ ] 3.3.2 Verify round-robin overhead is <10% on average
- [ ] 3.3.3 Document worst-case scenarios

### 3.4 Final Validation

- [ ] 3.4.1 Run full test suite: `npm test`
- [ ] 3.4.2 Run evidence suite: `npm run evidence:shrinking-fairness`
- [ ] 3.4.3 Run `npx openspec validate improve-shrinking-fairness --strict`
- [ ] 3.4.4 Code review focusing on correctness of shrinking logic

## Acceptance Criteria

- [ ] Property `forall(a,b,c: int(0,100)).then(a+b+c <= 150)` produces balanced results
- [ ] Variance of final values is reduced by >50%
- [ ] Quantifier order does not significantly affect shrunk counterexample
- [ ] Performance overhead is <10% for typical cases
- [ ] All existing tests pass (with shrunk value updates where needed)
- [ ] Documentation clearly explains fairness and when to use each strategy
