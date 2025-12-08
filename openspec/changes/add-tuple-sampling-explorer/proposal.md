# Change: Add Tuple Sampling Explorer for Holistic Execution

## Why

The current nested loop execution creates O(sampleSize^n) test evaluations for n quantifiers. For properties with many forall quantifiers, this leads to combinatorial explosion:
- 3 quantifiers × 1000 samples = 1 billion tests
- 5 quantifiers × 1000 samples = 10^15 tests

For pure `forall` scenarios (no `exists`), we can avoid this by sampling from the cartesian product directly as tuples, achieving O(budget) complexity regardless of quantifier count.

## What Changes

- **NEW**: `TupleSamplingExplorer` that samples test cases as tuples
- **NEW**: Factory method `withTupleExploration()` to enable this explorer
- **NEW**: Preset `fc.strategies.holistic` using tuple exploration
- Existing `NestedLoopExplorer` unchanged (still default)

## Impact

- Affected specs: `strategies`
- Affected code: new `src/strategies/TupleSamplingExplorer.ts`, `src/strategies/presets.ts`
- No breaking changes - new opt-in feature
- **Limitation**: Only works for pure `forall` scenarios (no `exists`)
- Depends on: `refactor-extract-explorer`, `refactor-extract-scenario-ast`
