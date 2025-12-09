# Tasks: Extract Sampler Interface

## 1. Define Sampler Interface

- [ ] 1.1 Create `src/strategies/Sampler.ts`
- [ ] 1.2 Define `Sampler` interface with core methods
- [ ] 1.3 Define `SamplerConfig` for RNG and other settings

## 2. Implement Base Sampler

- [ ] 2.1 Implement `RandomSampler` using existing logic from `Random` mixin
- [ ] 2.2 Support configurable RNG injection

## 3. Implement Sampler Decorators

- [ ] 3.1 Implement `BiasedSampler` wrapping another sampler
- [ ] 3.2 Implement `CachedSampler` with memoization
- [ ] 3.3 Implement `DedupingSampler` for unique sampling

## 4. Integrate with FluentStrategy

- [ ] 4.1 Add `sampler` property to FluentStrategy
- [ ] 4.2 Update `buildArbitraryCollection()` to delegate to sampler
- [ ] 4.3 Update FluentStrategyFactory to compose samplers

## 5. Maintain Backward Compatibility

- [ ] 5.1 Keep existing mixins functional (delegate to new Sampler)
- [ ] 5.2 Ensure existing tests pass without modification

## 6. Testing

- [ ] 6.1 Add unit tests for each Sampler implementation
- [ ] 6.2 Test decorator composition
- [ ] 6.3 Verify bias behavior preserved
- [ ] 6.4 Verify caching behavior preserved
- [ ] 6.5 Verify deduplication behavior preserved

## 7. Documentation

- [ ] 7.1 Add JSDoc to Sampler interface and implementations
- [ ] 7.2 Export Sampler types from public API
