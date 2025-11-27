# Implementation Tasks

## 1. Core Implementation
- [ ] 1.1 Create `FluentProperty` interface in `src/FluentProperty.ts`
- [ ] 1.2 Implement `prop()` function with single arbitrary overload
- [ ] 1.3 Add overloads for 2-5 arbitraries
- [ ] 1.4 Implement `check()` method delegating to `scenario().forall().then().check()`
- [ ] 1.5 Implement `assert()` method with descriptive error messages
- [ ] 1.6 Implement `config()` method for strategy configuration

## 2. Type Safety
- [ ] 2.1 Ensure full type inference for property function parameters
- [ ] 2.2 Add type tests for all overloads
- [ ] 2.3 Verify IDE autocomplete works correctly

## 3. Export & Integration
- [ ] 3.1 Export `prop` from `src/index.ts`
- [ ] 3.2 Export `FluentProperty` type for advanced users

## 4. Testing
- [ ] 4.1 Add unit tests for single arbitrary case
- [ ] 4.2 Add unit tests for multiple arbitraries (2-5)
- [ ] 4.3 Add tests for `assert()` throwing behavior
- [ ] 4.4 Add tests for `config()` with strategies
- [ ] 4.5 Add integration tests with real property scenarios

## 5. Documentation
- [ ] 5.1 Add JSDoc comments to all public APIs
- [ ] 5.2 Update README with shorthand examples
- [ ] 5.3 Add migration guide showing before/after
