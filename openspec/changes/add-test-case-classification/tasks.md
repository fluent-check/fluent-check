# Tasks: Add Test Case Classification

## 1. Scenario AST Extensions

- [x] 1.1 Add `ClassifyNode<Rec>` interface to `src/Scenario.ts`
  - Fields: `type: 'classify'`, `predicate: (args: Rec) => boolean`, `label: string`
- [x] 1.2 Add `LabelNode<Rec>` interface to `src/Scenario.ts`
  - Fields: `type: 'label'`, `fn: (args: Rec) => string`
- [x] 1.3 Add `CollectNode<Rec>` interface to `src/Scenario.ts`
  - Fields: `type: 'collect'`, `fn: (args: Rec) => string | number`
- [x] 1.4 Update `ScenarioNode` union type to include new node types
- [x] 1.5 Update `createScenario()` to handle new node types (no special processing needed)

## 2. FluentCheck API Methods

- [x] 2.1 Add `classify(predicate, label)` method to `FluentCheck`
  - Returns new `FluentCheck` with classify node added
  - Type-safe: preserves `Rec` type parameter
- [x] 2.2 Add `label(fn)` method to `FluentCheck`
  - Returns new `FluentCheck` with label node added
  - Type-safe: preserves `Rec` type parameter
- [x] 2.3 Add `collect(fn)` method to `FluentCheck`
  - Returns new `FluentCheck` with collect node added
  - Type-safe: preserves `Rec` type parameter
- [x] 2.4 Methods can be chained multiple times (multiple classifications per scenario)

## 3. Statistics Interface Updates

- [x] 3.1 Extend `FluentStatistics` interface in `src/statistics.ts`
  - Add optional `labels?: Record<string, number>` field
  - Add optional `labelPercentages?: Record<string, number>` field
- [x] 3.2 Update JSDoc comments for new fields

## 4. Classification Collection

- [x] 4.1 Add label tracking to `ExplorationState` in `src/strategies/Explorer.ts`
  - Add `labels: Map<string, number>` field to `ExplorationState` interface (line ~70)
- [x] 4.2 Initialize labels Map in `Explorer.explore()` when creating `ExplorationState`
  - Initialize as `new Map<string, number>()` in state creation (line ~191)
- [x] 4.3 Extract classification nodes from scenario in `Explorer.explore()`
  - Filter scenario nodes for `type === 'classify' | 'label' | 'collect'`
  - Similar to how `then` nodes are extracted in `#buildPropertyFunction`
- [x] 4.4 Update `TestCaseEvaluator` to evaluate classification nodes
  - Evaluate all classification predicates/functions for each test case
  - Increment label counts in `ExplorationState.labels` Map
  - Evaluate classifications before preconditions (so discarded tests are classified)
- [x] 4.5 Handle multiple labels per test case (classify can match multiple predicates)
- [x] 4.6 Handle label collisions (same label from different sources - sum counts)

## 5. ExplorationResult Extension

- [x] 5.1 Extend `ExplorationResult` types in `src/strategies/Explorer.ts`
  - Add optional `labels?: Map<string, number>` to `ExplorationPassed`, `ExplorationFailed`, `ExplorationExhausted`
  - Or create unified base type with labels field
- [x] 5.2 Update `ExplorationResultBuilder.toExplorationResult()` to include labels
  - Copy `ExplorationState.labels` to result
  - Convert Map to Record<string, number> for JSON serialization

## 6. Statistics Calculation

- [x] 6.1 Update `calculateStatistics` helper in `FluentCheck.check()` (line ~393)
  - Add `labels?: Map<string, number>` parameter
  - Convert Map to Record<string, number> for FluentStatistics
  - Calculate percentages: `(count / testsRun) * 100` for each label
- [x] 6.2 Update all 4 `calculateStatistics` calls (lines ~437, 447, 460, 482)
  - Pass `explorationResult.labels` (if present) to calculateStatistics
- [x] 6.3 Handle edge cases:
  - No classifications defined (labels/percentages undefined)
  - Zero tests run (percentages are 0 or undefined)
  - All tests discarded (percentages based on testsRun, not testsPassed)

## 7. Testing

- [x] 7.1 Test `classify()` method with single predicate
- [x] 7.2 Test `classify()` method with multiple predicates (overlapping)
- [x] 7.3 Test `label()` method with dynamic labeling
- [x] 7.4 Test `collect()` method with value aggregation
- [x] 7.5 Test label counts accuracy in statistics
- [x] 7.6 Test label percentages calculation
- [x] 7.7 Test multiple classifications in same scenario
- [x] 7.8 Test classification with preconditions (discarded tests)
- [x] 7.9 Test classification with unsatisfiable properties
- [x] 7.10 Test edge cases: empty labels, zero tests, all discarded
- [x] 7.11 Test label collisions (same label from different sources)

## 8. Documentation

- [x] 8.1 Add JSDoc comments to new methods
- [x] 8.2 Add examples to README or docs
- [ ] 8.3 Update CHANGELOG

## Acceptance Criteria

- [x] `classify()`, `label()`, and `collect()` methods are available on `FluentCheck`
- [x] Methods can be chained and used multiple times
- [x] `result.statistics.labels` contains accurate label counts
- [x] `result.statistics.labelPercentages` contains accurate percentages (0-100)
- [x] Classification works with preconditions (discarded tests counted)
- [x] Classification works with unsatisfiable properties
- [x] Performance overhead is < 5% for typical use cases
- [x] All existing tests continue to pass
