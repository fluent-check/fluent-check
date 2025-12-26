# Proposal: Improve Shrinking Fairness

**Goal**: Implement fair shrinking strategies to address the significant bias toward the first quantifier found in Study 14.

**Context**:
- **Study 14 Finding**: The current shrinking strategy minimizes the first quantifier to its absolute minimum (e.g., 0) while leaving subsequent quantifiers large or even growing them to compensate.
  - Example: Property `forall(a, b, c: int(0,100)).then(a + b + c <= 150)` shrinks to `(0, 52, 98)` for order `abc` but `(98, 52, 0)` for order `cba`
  - Statistical significance: ANOVA p < 0.0001
- **Impact**: Counterexamples are non-minimal in a holistic sense and arbitrarily depend on syntactic quantifier order rather than mathematical structure. This makes debugging harder and violates user expectations for symmetric properties.
- **Root Cause**: The Sequential Exhaustive algorithm (src/strategies/Shrinker.ts:257-270) uses `break` after any successful shrink, restarting from the first quantifier. This causes lexicographic minimization that heavily biases toward early quantifiers.

**Solution Options** (See `docs/research/fair-shrinking-strategies.md` for detailed analysis and `docs/evidence/shrinking-strategies-comparison.md` for empirical validation):

1. **Round-Robin (Interleaved)** — **RECOMMENDED**
   - Try each quantifier once per round, regardless of success
   - Change: Remove single `break` statement (line 265)
   - Fairness: High (variance reduced by ~73%)
   - Complexity: Trivial (5 LOC change)
   - Cost: ~5% more attempts

2. **Delta Debugging** — Maximum Quality
   - Test subsets of quantifiers simultaneously
   - Fairness: Very high (variance reduced by ~97%)
   - Complexity: Medium (~80 LOC)
   - Cost: ~60% more attempts

3. **Configurable Strategy** — User Choice
   - Allow users to select shrinking strategy via config
   - Backwards compatible (default to current behavior)

**Scope**:
- **Minimal Change (Phase 1)**: Implement Round-Robin as default, keep current behavior under legacy flag
- **Full Solution (Phase 2)**: Add configurable strategies via `FluentStrategyFactory`
- **Long-term (Phase 3)**: Migrate to integrated shrinking (choice-based) for compositional benefits

**Non-Goals**:
- This proposal does NOT address filter inefficiency (a separate, unsolvable problem)
- This proposal does NOT implement integrated shrinking (tracked separately)
