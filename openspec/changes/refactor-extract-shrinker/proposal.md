# Change: Extract Shrinker Interface for Counterexample Minimization

## Why

Shrinking logic is currently embedded in `FluentStrategy` via the `Shrinkable` mixin and `configArbitrary()` with depth tracking. This tangles shrinking with exploration and makes it impossible to implement alternative shrinking strategies (like tuple shrinking, binary search, or delta debugging).

Extracting a `Shrinker` interface:
1. Separates "how to minimize counterexamples" from "how to find them"
2. Enables different shrinking algorithms via polymorphism
3. Makes shrinking behavior independently testable
4. Allows shrinking to be optional or swapped without affecting exploration

## What Changes

- **NEW**: `Shrinker<Rec>` interface with `shrink(counterexample, scenario, property, sampler, budget)` method
- **NEW**: `ShrinkBudget` type for controlling shrink iterations
- **NEW**: `ShrinkResult<Rec>` type for shrinking outcomes
- **NEW**: `PerArbitraryShrinker` implementing current behavior
- **NEW**: `NoOpShrinker` for when shrinking is disabled
- **MODIFIED**: Shrinking logic moves from `Shrinkable` mixin to Shrinker implementations
- **MODIFIED**: `FluentStrategyFactory.withShrinking()` configures a Shrinker

## Impact

- Affected specs: `strategies`, `shrinking`
- Affected code: `src/strategies/FluentStrategy.ts`, `src/strategies/FluentStrategyMixins.ts`, new `src/strategies/Shrinker.ts`
- No breaking changes to public API
- Enables adding TupleShrinker and other strategies later
- Depends on: `refactor-extract-scenario-ast`, `refactor-extract-sampler`
