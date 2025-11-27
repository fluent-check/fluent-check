# Implementation Tasks

## 1. Core Implementation
- [x] 1.1 Create `FluentProperty` interface in `src/FluentProperty.ts`
- [x] 1.2 Implement `prop()` function with single arbitrary overload
- [x] 1.3 Add overloads for 2-5 arbitraries
- [x] 1.4 Implement `check()` method delegating to `scenario().forall().then().check()`
- [x] 1.5 Implement `assert()` method with descriptive error messages
- [x] 1.6 Implement `config()` method for strategy configuration

## 2. Type Safety
- [x] 2.1 Ensure full type inference for property function parameters
- [x] 2.2 Add type tests for all overloads
- [x] 2.3 Verify IDE autocomplete works correctly

## 3. Export & Integration
- [x] 3.1 Export `prop` from `src/index.ts`
- [x] 3.2 Export `FluentProperty` type for advanced users

## 4. Testing
- [x] 4.1 Add unit tests for single arbitrary case
- [x] 4.2 Add unit tests for multiple arbitraries (2-5)
- [x] 4.3 Add tests for `assert()` throwing behavior
- [x] 4.4 Add tests for `config()` with strategies
- [x] 4.5 Add integration tests with real property scenarios

## 5. Documentation
- [x] 5.1 Add JSDoc comments to all public APIs
- [x] 5.2 Update README with shorthand examples
- [x] 5.3 Add migration guide showing before/after
