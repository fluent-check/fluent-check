# Design: Edge-Biased Lengths

## Problem
Uniformly sampling length $L \in [min, max]$ wastes samples on "average" lengths which rarely trigger bugs.
Most collection bugs occur at $L=min$ (empty), $L=min+1$ (single), or $L=max$ (full/overflow).

## Solution
Change length generation logic to:
- With probability $P_{edge}$ (e.g. 0.2): Sample from $\{min, min+1, max-1, max\}$.
- With probability $1-P_{edge}$: Sample uniformly from $[min, max]$.

Or use a specific distribution like `Geometric` (favoring small) but capped at `max`.
Study 15 used `edge_biased` defined as:
```typescript
function sampleLength(min, max): int {
  const r = random();
  if (r < 0.1) return min;
  if (r < 0.2) return max;
  if (r < 0.3) return min + 1;
  return uniform(min, max);
}
```

## Architecture

### `Arbitrary` Updates
- `src/arbitraries/types.ts` or `util.ts` likely contains helper for length generation.
- Update `ArrayArbitrary`, `StringArbitrary` to use this helper.

### Configuration
- Ideally, `fc.config().withLengthStrategy('uniform' | 'edge-biased')`.
- But changing the default is the primary goal.

### Compatibility
- Respects existing `min`, `max` params.
- Only changes the *probability* of specific lengths, not the *possibility*.
