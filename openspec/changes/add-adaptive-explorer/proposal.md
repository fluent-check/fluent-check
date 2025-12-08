# Change: Add Adaptive Explorer for Automatic Strategy Selection

## Why

Users shouldn't need to understand execution strategies to get good performance. An adaptive explorer can analyze the scenario structure and automatically choose the best traversal approach:

- Pure `forall` with many quantifiers → Tuple sampling (O(budget))
- Mixed `forall`/`exists` → Nested loops (required for semantics)
- Few quantifiers → Nested loops (simpler, similar performance)

This provides optimal performance by default without configuration.

## What Changes

- **NEW**: `AdaptiveExplorer` that delegates to appropriate explorer based on scenario analysis
- **NEW**: Factory method `withAdaptiveExploration()` to enable
- **NEW**: Preset `fc.strategies.smart` using adaptive exploration
- Heuristics for choosing between NestedLoop and TupleSampling explorers

## Impact

- Affected specs: `strategies`
- Affected code: new `src/strategies/AdaptiveExplorer.ts`, `src/strategies/presets.ts`
- No breaking changes - new opt-in feature
- Could become the new default in a future major version
- Depends on: `refactor-extract-explorer`, `add-tuple-sampling-explorer`
