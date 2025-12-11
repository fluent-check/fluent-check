# Tasks: Extract Scenario AST

## 1. Define Scenario Types

- [x] 1.1 Create `src/Scenario.ts` with `ScenarioNode` discriminated union
- [x] 1.2 Define `QuantifierNode` type for forall/exists
- [x] 1.3 Define `PredicateNode` type for given/then (including `WhenNode`)
- [x] 1.4 Define `Scenario<Rec>` interface with readonly nodes array
- [x] 1.5 Add derived properties: `quantifiers`, `hasExistential`, `searchSpaceSize`

## 2. Extract Scenario from FluentCheck

- [x] 2.1 Add `buildScenario()` method to FluentCheck base class
- [x] 2.2 Implement node extraction from `pathFromRoot()` via `toScenarioNode()`
- [x] 2.3 Ensure type safety - Scenario<Rec> matches FluentCheck<Rec>

## 3. Update Check Flow

- [x] 3.1 Modify `check()` to build scenario before execution
- [x] 3.2 Pass scenario to execution logic (preparation for PropertyChecker)
- [x] 3.3 Maintain backward compatibility with existing behavior

## 4. Testing

- [x] 4.1 Add unit tests for Scenario type construction
- [x] 4.2 Add tests for derived properties (quantifiers, hasExistential, etc.)
- [x] 4.3 Verify existing tests still pass (629 tests passing)

## 5. Documentation

- [x] 5.1 Add JSDoc to Scenario types
- [x] 5.2 Export Scenario types from public API
