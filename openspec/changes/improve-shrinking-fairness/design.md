# Design: Interleaved Shrinking

## Problem
Current `PerArbitraryShrinker` iterates through quantifiers $q_1, \dots, q_n$.
It fully shrinks $q_1$ before touching $q_2$.
If the property failure depends on the sum $q_1 + q_2 > K$, shrinking $q_1$ to 0 forces $q_2$ to remain $> K$.
Result: $(0, K+1)$. Ideal: $(K/2, K/2)$.

## Solution
Change the iteration loop in `PerArbitraryShrinker` (or create `InterleavedShrinker`).
Instead of:
```
foreach q in quantifiers:
  while q can shrink:
    shrink q
```

Use Round-Robin:
```
changed = true
while changed:
  changed = false
  foreach q in quantifiers:
    if q can shrink:
      shrink q (one step)
      changed = true
```

Or a hybrid:
Try shrinking $q_1$ a bit, then $q_2$ a bit, etc.

## Architecture

### `InterleavedShrinker`
- Extends `Shrinker`.
- Maintains state of "current best shrinkable" for each quantifier.
- **Round-Robin Strategy**:
  1. Iterate all quantifiers.
  2. For each, try to generate *one* smaller candidate.
  3. If successful (test fails), update current best and continue.
  4. Repeat until no quantifier can produce a smaller failing candidate.

### Trade-offs
- **Pros**: Produces "fairer" counterexamples (closer to origin in Euclidean sense).
- **Cons**: Might be slower (more test executions) because it doesn't exhaust easy shrinks quickly? Actually, typically similar speed, just different path.

### Configuration
`fc.strategy().withShrinkingStrategy('interleaved')` (default 'sequential').
