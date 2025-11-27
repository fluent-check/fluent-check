# Implementation Tasks

## 1. Core Implementation
- [x] 1.1 Create `PreconditionFailure` error class
- [x] 1.2 Implement `pre()` function with type assertion
- [x] 1.3 Add optional message parameter support
- [x] 1.4 Modify `FluentCheckAssert.run()` to catch `PreconditionFailure`
- [x] 1.5 Handle skipped cases appropriately (neither pass nor fail)

## 2. Statistics (Optional Enhancement)
- [x] 2.1 Add skip count to `FluentResult`
- [ ] 2.2 Track precondition failure reasons if messages provided
- [ ] 2.3 Add warning if skip rate exceeds threshold (e.g., 50%)

## 3. Export & Integration
- [x] 3.1 Export `pre` from `src/index.ts`
- [x] 3.2 Export `PreconditionFailure` for advanced users

## 4. Testing
- [x] 4.1 Add unit tests for basic precondition usage
- [x] 4.2 Add tests for precondition with message
- [x] 4.3 Add tests verifying skipped cases don't count as failures
- [x] 4.4 Add tests for multiple preconditions in same test
- [x] 4.5 Add integration tests with division by zero scenario

## 5. Documentation
- [x] 5.1 Add JSDoc comments explaining precondition semantics
- [x] 5.2 Update README with precondition examples
- [x] 5.3 Document difference between `filter()` and `pre()`
