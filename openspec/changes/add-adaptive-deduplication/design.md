# Design: Adaptive Deduplication

## Problem
Users rarely know when to enable deduplication.
- If domain is large ($10^{9}$), deduplication adds memory overhead ($O(N)$) for no gain (collisions rare).
- If domain is small ($10$), sampling 100 times without deduplication wastes 90 tests and might miss the last 1 value due to randomness.

## Solution
**Heuristic**: Enable deduplication if `arbitrary.size().value <= 2 * sampleCount` (or similar threshold).
Or simply: If `arbitrary.size().type === 'exact'` and is small.

## Architecture
- **`Explorer`**: Before sampling loop:
  - Check `arbitrary.size()`.
  - If small, use `sampler.sampleUnique()`.
  - Else, use `sampler.sample()`.
- **`Sampler`**:
  - `sampleUnique` handles the retries/exhaustion logic.

## Trade-offs
- **Overhead**: Checking size is cheap. `sampleUnique` is expensive if size is underestimated (infinite loop risk).
- **Safety**: Must rely on accurate size (hence dependency on "Improve Size Estimation").

## Dependency
Strongly depends on accurate size estimation. If filter returns size 1000 but is actually 10, adaptive dedup won't trigger.
So this proposal pairs with `improve-size-estimation`.
