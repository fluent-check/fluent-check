# Proposal: Improve Size Estimation

**Goal**: Implement a sampling-based size estimation mechanism to replace or augment the static size calculation for `MappedArbitrary`, `FilterArbitrary`, and `ChainArbitrary`.

**Context**:
- **Study 3.1 Finding**: Filter chains (depth 5, 50% pass) overestimate size by **3600%**. The static calculation assumes filters are "rarely restrictive" or cannot know the pass rate.
- **Study 3.3 Finding**: Mapped arbitraries (10-to-1 map) overestimate size by **1000%** (10x). The system assumes maps are bijective.
- **Impact**: When these arbitraries are combined in a `oneof` or `frequency`, their probability mass is grossly inflated, destroying the user's intended distribution.

**Scope**:
- Add `estimateSize(sampler, samples)` method to `Arbitrary` interface (defaulting to static `size()`).
- Implement sampling logic in `MappedArbitrary` (check collisions) and `FilterArbitrary` (check pass rate).
- Update `frequency`/`oneof` to use `estimateSize` during initialization (if possible) or dynamically update weights.
