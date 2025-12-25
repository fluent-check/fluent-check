# Proposal: Improve Shrinking Fairness

**Goal**: Implement an "Interleaved" shrinking strategy to address the significant bias toward the first quantifier found in Study 14.

**Context**:
- **Study 14 Finding**: The current shrinking strategy minimizes the first quantifier to its absolute minimum (e.g., 0) while leaving subsequent quantifiers large or growing them to compensate.
- **Impact**: Counterexamples are non-minimal in a holistic sense (e.g., `(0, 1000, 1000)` instead of `(10, 10, 10)`). This makes debugging harder as the developer might focus on the "weirdly small" first value.
- **Solution**: "Interleaved" shrinking alternates between quantifiers during the shrinking process (round-robin), ensuring all quantifiers are reduced progressively and fairly.

**Scope**:
- Update `Shrinker` interface or implementation to support interleaving.
- The default behavior should likely remain "First" for compatibility, but "Interleaved" should be an option (or the new default if deemed superior).
- Configurable via `FluentStrategyFactory`.
