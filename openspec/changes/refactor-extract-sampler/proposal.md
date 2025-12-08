# Change: Extract Sampler Interface from FluentStrategy

## Why

The current `FluentStrategy` mixins (`Random`, `Biased`, `Cached`, `Dedupable`) all deal with one concern: **how to sample values from arbitraries**. This is conflated with execution control (`hasInput`/`getInput`) and shrinking (`shrink`).

Extracting a `Sampler` interface:
1. Creates a single-responsibility component for value generation
2. Enables decorator-based composition (cleaner than class mixins)
3. Makes sampling logic reusable across different execution strategies
4. Simplifies testing of sampling behavior in isolation

## What Changes

- **NEW**: `Sampler` interface with `sample()`, `sampleUnique()`, `sampleWithBias()` methods
- **NEW**: `RandomSampler` base implementation
- **NEW**: `BiasedSampler`, `CachedSampler`, `DedupingSampler` decorators
- **MODIFIED**: `FluentStrategy` uses a `Sampler` internally instead of mixin behavior
- **DEPRECATED**: Direct use of sampling mixins (facade preserved for compatibility)

## Impact

- Affected specs: `strategies`
- Affected code: `src/strategies/FluentStrategy.ts`, `src/strategies/FluentStrategyMixins.ts`, new `src/strategies/Sampler.ts`
- No breaking changes to public API
- Internal refactoring with decorator pattern replacing mixins for sampling
