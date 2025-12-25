# Design: Flat Random Explorer

## Problem
The current `NestedLoopExplorer` generates a fixed pool of $k = \lfloor N^{1/d} \rfloor$ samples for each of the $d$ quantifiers and iterates through their Cartesian product ($k^d \approx N$).
This means each quantifier only sees $k$ distinct values. For $N=1000, d=3$, $k=10$. This is insufficient for coverage.

## Solution
`FlatExplorer` does not pre-generate pools. Instead, for each test run $i \in [1, N]$:
1. It iterates through all quantifiers $q_1, \dots, q_d$.
2. For each $q_j$, it calls `q_j.sample(sampler, 1)` to get a **fresh** random value.
3. It constructs the test case and evaluates the property.

## Architecture

### `FlatExplorer` Implementation
- Extends `AbstractExplorer`.
- **Method `generateSamples`**: Returns empty map (or is bypassed).
- **Method `traverse`**:
  - Instead of nested loops, it has a single loop from $1$ to $budget.maxTests$.
  - Inside the loop:
    - Generate a full `testCase` by sampling every quantifier.
    - Evaluate property.
    - If failure, return `fail(testCase)`.
    - If success, continue.
- **Handling `exists`**:
  - `NestedLoop` behavior: "Try to find ONE combination that works".
  - `Flat` behavior: "Try random combinations until one works".
  - This is compatible.

### Integration
- `FluentStrategyFactory`:
  - Add `withRandomExploration()` (or `withFlatExploration()`).
  - Updates `buildExplorer()` to return `new FlatExplorer()`.

### Trade-offs
- **Pros**:
  - Maximizes diversity ($N$ unique values per quantifier).
  - Simpler iteration logic (no recursion state).
  - Better for "finding needle in haystack".
- **Cons**:
  - May miss "combinatorial" bugs that `NestedLoop` is good at (e.g. "fail if $a=x$ AND $b=y$", where $x,y$ are in the small pools). `NestedLoop` guarantees trying $(x,y)$ if they are in pools. `Flat` relies on probability.
  - However, for large domains, `NestedLoop` pools are so small that `Flat` is usually strictly better.

## API Changes
```typescript
fc.strategy()
  .withRandomExploration() // Use FlatExplorer
```
Default remains `NestedLoop` for now (to preserve behavior), but we might recommend `Random` for depth > 2.

```