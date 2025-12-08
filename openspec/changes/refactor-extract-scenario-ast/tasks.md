# Tasks: Extract Scenario AST

## 1. Define Scenario Types

- [ ] 1.1 Create `src/Scenario.ts` with `ScenarioNode` discriminated union
- [ ] 1.2 Define `QuantifierNode` type for forall/exists
- [ ] 1.3 Define `PredicateNode` type for given/then
- [ ] 1.4 Define `Scenario<Rec>` interface with readonly nodes array
- [ ] 1.5 Add derived properties: `quantifiers`, `hasExistential`, `searchSpaceSize`

## 2. Extract Scenario from FluentCheck

- [ ] 2.1 Add `buildScenario()` method to FluentCheck base class
- [ ] 2.2 Implement node extraction from `pathFromRoot()`
- [ ] 2.3 Ensure type safety - Scenario<Rec> matches FluentCheck<Rec>

## 3. Update Check Flow

- [ ] 3.1 Modify `check()` to build scenario before execution
- [ ] 3.2 Pass scenario to execution logic (preparation for PropertyChecker)
- [ ] 3.3 Maintain backward compatibility with existing behavior

## 4. Testing

- [ ] 4.1 Add unit tests for Scenario type construction
- [ ] 4.2 Add tests for derived properties (quantifiers, hasExistential, etc.)
- [ ] 4.3 Verify existing tests still pass

## 5. Documentation

- [ ] 5.1 Add JSDoc to Scenario types
- [ ] 5.2 Export Scenario types from public API
