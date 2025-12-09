# Tasks: Extract Explorer Interface

## 1. Define Explorer Types

- [x] 1.1 Create `src/strategies/Explorer.ts`
- [x] 1.2 Define `Explorer<Rec>` interface with `explore()` method
- [x] 1.3 Define `ExplorationBudget` type (maxTests, maxTime?)
- [x] 1.4 Define `ExplorationResult<Rec>` discriminated union (passed/failed/exhausted)

## 2. Implement NestedLoopExplorer

- [x] 2.1 Extract nested loop logic from `FluentCheckQuantifier.run()`
- [x] 2.2 Implement `NestedLoopExplorer` with same behavior
- [x] 2.3 Handle forall/exists quantifier semantics correctly
- [x] 2.4 Respect budget limits (maxTests)
- [x] 2.5 Handle `given` predicates (filtering/skipping)

## 3. Integrate with FluentCheck

- [x] 3.1 Add explorer configuration to FluentCheck/FluentStrategyFactory
- [x] 3.2 Explorer available via `factory.buildExplorer()` for standalone use
- [x] 3.3 Scenario available via `chain.buildScenario()` for explorer input

## 4. Update FluentStrategyFactory

- [x] 4.1 Add `withNestedExploration()` method (default)
- [x] 4.2 Add `withExplorer()` method for custom explorers
- [x] 4.3 Add `buildExplorer()` and `buildStandaloneSampler()` methods

## 5. Testing

- [x] 5.1 Add unit tests for NestedLoopExplorer (test/explorer.test.ts)
- [x] 5.2 Test budget limits are respected
- [x] 5.3 Test forall semantics (fail on any failure)
- [x] 5.4 Test exists semantics (succeed on any success)
- [x] 5.5 Verify all existing tests pass (646 tests passing)

## 6. Documentation

- [x] 6.1 Add JSDoc to Explorer interface
- [x] 6.2 Document ExplorationResult variants
