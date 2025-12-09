# Tasks: Add Adaptive Explorer

## 1. Implement AdaptiveExplorer

- [ ] 1.1 Create `src/strategies/AdaptiveExplorer.ts`
- [ ] 1.2 Analyze scenario for existential quantifiers
- [ ] 1.3 Count number of quantifiers
- [ ] 1.4 Implement selection heuristics:
  - `exists` present → NestedLoopExplorer
  - 4+ pure forall → TupleSamplingExplorer
  - Otherwise → NestedLoopExplorer
- [ ] 1.5 Delegate to selected explorer

## 2. Make Heuristics Configurable

- [ ] 2.1 Allow threshold customization (e.g., quantifier count threshold)
- [ ] 2.2 Document default heuristics

## 3. Integrate with Factory

- [ ] 3.1 Add `withAdaptiveExploration()` method to CheckerFactory
- [ ] 3.2 Optionally accept heuristic configuration

## 4. Add Smart Preset

- [ ] 4.1 Add `fc.strategies.smart` or `fc.checkers.smart` preset
- [ ] 4.2 Configure with AdaptiveExplorer
- [ ] 4.3 Include appropriate sampler decorators

## 5. Testing

- [ ] 5.1 Test selects NestedLoop for exists scenarios
- [ ] 5.2 Test selects TupleSampling for many forall scenarios
- [ ] 5.3 Test selects NestedLoop for simple scenarios
- [ ] 5.4 Test custom threshold configuration
- [ ] 5.5 Test correct results regardless of selected explorer

## 6. Documentation

- [ ] 6.1 Document selection heuristics
- [ ] 6.2 Document when to use adaptive vs explicit
- [ ] 6.3 Add usage examples
