# Proposal: Add Flat Random Explorer

**Goal**: Introduce a `FlatExplorer` strategy that performs pure random sampling of the joint search space, avoiding the "sample size collapse" problem inherent in `NestedLoopExplorer` for deep scenarios.

**Context**:
- **Study 5.3 Finding**: `NestedLoopExplorer` (current default) partitions the global sample budget $N$ into $\lfloor N^{1/d} \rfloor$ distinct values per quantifier for a scenario of depth $d$.
- **Impact**: At depth 3 with budget 1000, only ~10 unique values are tested for each variable, drastically reducing the probability of finding bugs that depend on specific values (e.g., "magic number" bugs).
- **Solution**: A "Flat" or "Random" explorer generates a fresh random sample for *every* quantifier in *every* test case. This ensures $N$ distinct samples for each quantifier (asymptotically), restoring detection power for deep scenarios.

**Scope**:
- Implement `FlatExplorer` class implementing `Explorer` interface.
- Add `withFlatExplorer()` or `withRandomExploration()` configuration option to `FluentStrategyFactory`.
- Ensure it supports all existing features: preconditions, `given`, `when`, classification, coverage.
- Shrinking remains unchanged (it operates on the failed test case regardless of how it was found).

