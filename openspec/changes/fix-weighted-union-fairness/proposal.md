# Proposal: Fix Weighted Union Fairness

**Goal**: Correct the bias in `frequency` and `oneof` arbitraries to ensure they respect user-defined probabilities, particularly in highly skewed configurations (e.g., 1:99).

**Context**:
- **Study 2.2 Finding**: The `Weighted Union Probability Study` revealed a statistically significant deviation (p=0.0257) in the observed frequencies for a 1:99 split scenario. The expected 1% branch was selected 0.98% of the time, which, while small, indicates a systematic bias or precision issue.
- **Impact**: Test coverage may be skewed away from critical low-probability paths defined by the user.

**Scope**:
- Investigate `Arbitrary.ts` and `frequency` implementation.
- Refactor the weight selection logic (possibly switching to a more robust alias method or higher-precision floating point selection).
- Ensure `oneof` (which uses uniform weights) is also unbiased.
