# Proposal: Add Adaptive Deduplication

**Goal**: Automatically enable deduplication when an arbitrary's effective domain size is small relative to the requested sample count, improving coverage and efficiency.

**Context**:
- **Study 3.2 Finding**: Deduplication provides massive benefits (37% coverage boost) for "small" arbitraries (e.g., filtered or mapped to < 20 values) when sampling count is high.
- **Current State**: Deduplication is opt-in (via `DedupingSampler` or `sampleUnique`).
- **Solution**: The `Sampler` or `Explorer` should check `arbitrary.size()` (or `estimateSize()`). If `size < requested_samples`, automatically wrap in `DedupingSampler` (or logic equivalent).

**Scope**:
- Update `FluentStrategyFactory` or `Explorer` loop.
- Use `Arbitrary.size()` to decide.
- Add configuration to disable this auto-behavior (`.withAutoDeuplication(false)`).
