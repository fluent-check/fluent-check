# Tasks: Add Tuple Sampling Explorer

## 1. Implement TupleSamplingExplorer

- [ ] 1.1 Create `src/strategies/TupleSamplingExplorer.ts`
- [ ] 1.2 Validate scenario has no `exists` quantifiers (throw if present)
- [ ] 1.3 Build tuple arbitrary from all quantifier arbitraries
- [ ] 1.4 Sample tuples directly using sampler
- [ ] 1.5 Convert tuple samples to named test cases
- [ ] 1.6 Iterate flat over samples (O(budget), not nested)
- [ ] 1.7 Handle `given` predicates by filtering

## 2. Integrate with Factory

- [ ] 2.1 Add `withTupleExploration()` method to CheckerFactory
- [ ] 2.2 Throw clear error if used with exists-containing scenarios

## 3. Add Holistic Preset

- [ ] 3.1 Add `fc.strategies.holistic` or `fc.checkers.holistic` preset
- [ ] 3.2 Configure with TupleSamplingExplorer
- [ ] 3.3 Include appropriate sampler decorators (bias, dedup)

## 4. Testing

- [ ] 4.1 Test tuple exploration produces O(budget) evaluations
- [ ] 4.2 Test with 5+ quantifiers completes in reasonable time
- [ ] 4.3 Test throws error for scenarios with `exists`
- [ ] 4.4 Test counterexample detection works correctly
- [ ] 4.5 Test `given` filtering works

## 5. Documentation

- [ ] 5.1 Document when to use tuple exploration
- [ ] 5.2 Document limitation with `exists` quantifiers
- [ ] 5.3 Add usage examples
