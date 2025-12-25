# Design: Fair Weighted Union

## Problem
The `frequency` arbitrary likely uses a cumulative weight array and a random number to select a branch.
Possible sources of bias:
1. Floating point precision errors when summing weights.
2. `Math.random()` (or `rng()`) quantization effects if the range is small.
3. Interaction with `MappedArbitrary` or size-based weighting if enabled implicitly.

## Solution
1. **Integer Arithmetic**: Convert all weights to integers (if not already) and use total weight $W$.
2. **Robust Selection**: Generate random integer $R \in [0, W-1]$. Iterate to find index.
3. **Validation**: Use the `weighted-union` evidence script to verify the fix.

## Architecture
- **`FrequencyArbitrary`**: Ensure it normalizes weights correctly.
- **`RandomGenerator`**: Ensure it generates uniform integers in range without bias (e.g., using rejection sampling for non-power-of-2 ranges if needed).

## Trade-offs
- Slight performance cost for integer normalization or rejection sampling? Likely negligible compared to arbitrary generation.
