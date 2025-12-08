# Change: Extract Explorer Interface for Search Space Navigation

> **GitHub Issue:** [#502](https://github.com/fluent-check/fluent-check/issues/502)

## Why

The execution loop is currently embedded in `FluentCheckQuantifier.run()` as nested loops. This hardcodes one traversal strategy and makes it impossible to implement alternative approaches like tuple sampling without boolean flags and `if/else` branching.

Extracting an `Explorer` interface:
1. Separates "how to navigate the search space" from "how to sample values"
2. Enables different traversal strategies via polymorphism (not conditionals)
3. Creates a clear extension point for holistic strategies
4. Allows budget-based execution control

## What Changes

- **NEW**: `Explorer<Rec>` interface with `explore(scenario, property, sampler, budget)` method
- **NEW**: `ExplorationBudget` type for controlling test limits
- **NEW**: `ExplorationResult<Rec>` discriminated union for outcomes
  - **IMPORTANT**: The `counterexample` field returns `PickResult<Rec>` (record of `FluentPick` objects), not raw values
  - This ensures shrinking has access to both `value` and `original` for each quantifier
- **NEW**: `NestedLoopExplorer` implementing current behavior
- **MODIFIED**: `FluentCheck.check()` delegates to an Explorer
- **MODIFIED**: Execution logic moves from `FluentCheckQuantifier.run()` to Explorer

### Type Definitions

```typescript
// Result of picking values from all quantifiers in a scenario
type PickResult<Rec> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

// Exploration outcome
type ExplorationResult<Rec> =
  | { outcome: 'passed'; testsRun: number }
  | { outcome: 'failed'; counterexample: PickResult<Rec>; testsRun: number }
  | { outcome: 'exhausted'; testsRun: number }

interface Explorer<Rec> {
  explore(
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler<Rec>,
    budget: ExplorationBudget
  ): ExplorationResult<Rec>
}
```

## Impact

- Affected specs: `strategies`
- Affected code: `src/FluentCheck.ts`, new `src/strategies/Explorer.ts`
- No breaking changes to public API
- Enables adding TupleSamplingExplorer and AdaptiveExplorer in future changes
- Depends on: `refactor-extract-scenario-ast`, `refactor-extract-sampler`
