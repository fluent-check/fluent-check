# Change: Extract Shrinker Interface for Counterexample Minimization

> **GitHub Issue:** [#505](https://github.com/fluent-check/fluent-check/issues/505)

## Why

Shrinking logic is currently embedded in `FluentStrategy` via the `Shrinkable` mixin and `configArbitrary()` with depth tracking. This tangles shrinking with exploration and makes it impossible to implement alternative shrinking strategies (like tuple shrinking, binary search, or delta debugging).

Extracting a `Shrinker` interface:
1. Separates "how to minimize counterexamples" from "how to find them"
2. Enables different shrinking algorithms via polymorphism
3. Makes shrinking behavior independently testable
4. Allows shrinking to be optional or swapped without affecting exploration

## What Changes

- **NEW**: `Shrinker<Rec>` interface with `shrink(counterexample, scenario, property, sampler, budget)` method
  - **IMPORTANT**: The `counterexample` parameter is `PickResult<Rec>` (record of `FluentPick` objects), not raw values
  - This provides access to both `value` and `original` needed for `Arbitrary.shrink()` calls
- **NEW**: `ShrinkBudget` type for controlling shrink iterations
- **NEW**: `ShrinkResult<Rec>` type for shrinking outcomes
  - Returns the minimized `PickResult<Rec>`, maintaining `FluentPick` structure
- **NEW**: `PerArbitraryShrinker` implementing current behavior
- **NEW**: `NoOpShrinker` for when shrinking is disabled
- **MODIFIED**: Shrinking logic moves from `Shrinkable` mixin to Shrinker implementations
- **MODIFIED**: `FluentStrategyFactory.withShrinking()` configures a Shrinker

### Type Definitions

```typescript
// Result of picking values from all quantifiers in a scenario
type PickResult<Rec> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

interface Shrinker<Rec> {
  shrink(
    counterexample: PickResult<Rec>,  // FluentPicks, not raw values
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler<Rec>,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>
}

type ShrinkResult<Rec> = {
  minimized: PickResult<Rec>  // FluentPicks, not raw values
  attempts: number
  rounds: number
}
```

## Impact

- Affected specs: `strategies`, `shrinking`
- Affected code: `src/strategies/FluentStrategy.ts`, `src/strategies/FluentStrategyMixins.ts`, new `src/strategies/Shrinker.ts`
- No breaking changes to public API
- Enables adding TupleShrinker and other strategies later
- Depends on: `refactor-extract-scenario-ast`, `refactor-extract-sampler`
