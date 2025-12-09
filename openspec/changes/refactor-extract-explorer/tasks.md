# Tasks: Extract Explorer Interface

## 1. Define Explorer Types

- [ ] 1.1 Create `src/strategies/Explorer.ts`
- [ ] 1.2 Define `Explorer<Rec>` interface with `explore()` method
- [ ] 1.3 Define `ExplorationBudget` type (maxTests, maxTime?)
- [ ] 1.4 Define `ExplorationResult<Rec>` discriminated union (passed/failed/exhausted)

## 2. Implement NestedLoopExplorer

- [ ] 2.1 Extract nested loop logic from `FluentCheckQuantifier.run()`
- [ ] 2.2 Implement `NestedLoopExplorer` with same behavior
- [ ] 2.3 Handle forall/exists quantifier semantics correctly
- [ ] 2.4 Respect budget limits (maxTests)
- [ ] 2.5 Handle `given` predicates (filtering/skipping)

## 3. Integrate with FluentCheck

- [ ] 3.1 Add explorer configuration to FluentCheck/FluentStrategyFactory
- [ ] 3.2 Modify `check()` to build scenario, then delegate to explorer
- [ ] 3.3 Convert ExplorationResult to FluentResult

## 4. Update FluentStrategyFactory

- [ ] 4.1 Add `withNestedExploration()` method (default)
- [ ] 4.2 Store explorer builder in factory
- [ ] 4.3 Pass explorer to PropertyChecker on build

## 5. Testing

- [ ] 5.1 Add unit tests for NestedLoopExplorer
- [ ] 5.2 Test budget limits are respected
- [ ] 5.3 Test forall semantics (fail on any failure)
- [ ] 5.4 Test exists semantics (succeed on any success)
- [ ] 5.5 Verify all existing tests pass

## 6. Documentation

- [ ] 6.1 Add JSDoc to Explorer interface
- [ ] 6.2 Document ExplorationResult variants
