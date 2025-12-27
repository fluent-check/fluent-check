# Tasks: Improve Shrinking Fairness

## Phase 1: Minimal Change (Round-Robin)

### 1.1 Core Implementation

- [x] 1.1.1 Create strategy pattern for shrinking via `ShrinkRoundStrategy` interface
  - Implemented in `src/strategies/shrinking/ShrinkRoundStrategy.ts`
  - Strategies: `SequentialExhaustiveStrategy`, `RoundRobinStrategy`, `DeltaDebuggingStrategy`
- [x] 1.1.2 Inject strategy via `PerArbitraryShrinker` constructor
  - Updated to accept `ShrinkRoundStrategy` parameter

### 1.2 Configuration Support

- [x] 1.2.1 Add `ShrinkingStrategy` type to `src/strategies/types.ts`
  ```typescript
  export type ShrinkingStrategy = 'sequential-exhaustive' | 'round-robin' | 'delta-debugging'
  ```
- [x] 1.2.2 Update `FluentStrategyFactory` to accept shrinking strategy
  - Added `withShrinkingStrategy(mode: ShrinkingStrategy)` method at line 185
  - Factory creates appropriate strategy instance via `#createStrategyInstance()`
- [x] 1.2.3 Export new types and strategies in `src/index.ts`

### 1.3 Testing

- [x] 1.3.1 Existing tests cover shrinking behavior
- [x] 1.3.2 All 898 tests pass
- [x] 1.3.3 Verified `npm test` passes

## Phase 2: Additional Strategies

### 2.1 Delta Debugging Shrinker

- [x] 2.1.1 Created `src/strategies/shrinking/DeltaDebuggingStrategy.ts`
  - Implements binary subset enumeration logic
  - Tests subsets of quantifiers simultaneously
- [x] 2.1.2 Added `'delta-debugging'` to `ShrinkingStrategy` union type
- [x] 2.1.3 Factory instantiates `DeltaDebuggingStrategy` when selected

### 2.2 Documentation

- [ ] 2.2.1 Update `docs/smart-shrinking.md` with fairness discussion
- [ ] 2.2.2 Add migration guide for users relying on lexicographic behavior
- [ ] 2.2.3 Document performance tradeoffs of each strategy
- [ ] 2.2.4 Add examples showing when to use each strategy

## Phase 3: Validation and Release

### 3.1 Evidence-Based Validation

- [x] 3.1.1 Create shrinking strategies comparison study
  - Implemented `scripts/evidence/shrinking-strategies-comparison.study.ts`
  - Tests all three strategies across 3 budget levels (100, 500, 2000)
  - **Updated property**: Independent threshold `a >= 10 AND b >= 10 AND c >= 10` with range 0-1,000,000
    - This property is better than compensating properties (like `a+b+c <= 150`) because
      variables are independent and don't force each other to grow when shrunk
  - Output: `docs/evidence/raw/shrinking-strategies.csv`

- [x] 3.1.2 Create analysis script `analysis/shrinking_strategies_comparison.py`
  - Computes summary statistics per strategy and budget
  - Runs ANOVA and Tukey HSD post-hoc tests
  - Analyzes positional bias with chi-squared tests
  - Tests quantifier order independence
  - Generates comparison tables

- [x] 3.1.3 Generate visualizations
  - Bar chart: Total distance by strategy and budget
  - Grouped bar: Optimal achievement by position
  - Box plot: Distance distribution
  - Line plot: Positional bias across budgets
  - Output: `docs/evidence/figures/shrinking-strategies-comparison.png`

- [x] 3.1.4 Validate against benchmarks
  - [x] Round-Robin total distance reduction: **51.1%** vs Sequential Exhaustive (✓ exceeds 50% target)
  - [x] Delta-Debugging total distance reduction: **44.5%** vs Sequential Exhaustive
  - [x] ANOVA shows significant difference: **F=90.00, p=0.0000** (✓ < 0.05)
  - [x] Tukey HSD: Round-Robin vs Sequential Exhaustive: **p=0.0000** (✓ Significant)
  - [x] Tukey HSD: Delta-Debugging vs Sequential Exhaustive: **p=0.0000** (✓ Significant)
  - [x] Tukey HSD: Round-Robin vs Delta-Debugging: **p=0.25-0.74** (Not significant - similar performance)

- [x] 3.1.5 Evidence study completed with corrected property formulation
  - Property: `a < 10 || b < 10 || c < 10` (passes when any < 10, fails when all >= 10)
  - 1,350 trials across 27 configurations (quick mode)
  - Results show clear 51% distance reduction for Round-Robin

- [x] 3.1.6 Document findings
  - Analysis complete with statistical conclusions
  - Visualizations generated
  - Configuration recommendations: Use Round-Robin as default

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
