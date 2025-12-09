# Tasks: Extract Sampler Interface

## 1. Define Sampler Interface

- [x] 1.1 Create `src/strategies/Sampler.ts`
- [x] 1.2 Define `Sampler` interface with core methods
- [x] 1.3 Define `SamplerConfig` for RNG and other settings

## 2. Implement Base Sampler

- [x] 2.1 Implement `RandomSampler` using existing logic from `Random` mixin
- [x] 2.2 Support configurable RNG injection

## 3. Implement Sampler Decorators

- [x] 3.1 Implement `BiasedSampler` wrapping another sampler
- [x] 3.2 Implement `CachedSampler` with memoization
- [x] 3.3 Implement `DedupingSampler` for unique sampling

## 4. Integrate with FluentStrategy

- [x] 4.1 Add `sampler` property to FluentStrategy
- [x] 4.2 Update `buildArbitraryCollection()` to delegate to sampler
- [x] 4.3 Update FluentStrategyFactory to compose samplers

## 5. Maintain Backward Compatibility

- [x] 5.1 Keep existing mixins functional (delegate to new Sampler)
- [x] 5.2 Ensure existing tests pass without modification

## 6. Testing

- [x] 6.1 Add unit tests for each Sampler implementation
- [x] 6.2 Test decorator composition
- [x] 6.3 Verify bias behavior preserved
- [x] 6.4 Verify caching behavior preserved
- [x] 6.5 Verify deduplication behavior preserved

## 7. Documentation

- [x] 7.1 Add JSDoc to Sampler interface and implementations
- [x] 7.2 Export Sampler types from public API
