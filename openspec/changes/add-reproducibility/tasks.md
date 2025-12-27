# Implementation Tasks: Add Reproducibility Features

## 1. Proposal & Specification
- [x] 1.1 Create GitHub issue from `proposal.md` and update header link
- [ ] 1.2 Validate change metadata with `openspec validate add-reproducibility --strict`
- [ ] 1.3 Create spec deltas for `fluent-api` and `reporting` capabilities

## 2. Path Tracking Implementation
- [ ] 2.1 Design path format (e.g., `"42:7"` for quantifier indices)
- [ ] 2.2 Add path tracking to `Explorer.traverse()` to record sample indices
- [ ] 2.3 Store path in `ExplorationResult` when failures/examples found
- [ ] 2.4 Add `path` property to `FluentResult`
- [ ] 2.5 Include path in error messages alongside seed

## 3. Replay API Implementation
- [ ] 3.1 Add `ReplayConfig` interface with `seed` and `path` properties
- [ ] 3.2 Add `.replay(config)` method to `FluentCheck` class
- [ ] 3.3 Create `FluentCheckReplay` node class
- [ ] 3.4 Implement path-based sample selection in `Explorer` when replay mode active
- [ ] 3.5 Ensure replay bypasses random generation and uses exact path indices
- [ ] 3.6 Add validation for path format and quantifier count matching

## 4. Regression Examples Implementation
- [ ] 4.1 Add `examples` property to `Scenario` interface
- [ ] 4.2 Add `.withExample(example)` method to `FluentCheck` class
- [ ] 4.3 Add `.withExamples(examples)` method for multiple examples
- [ ] 4.4 Create `FluentCheckExample` node class
- [ ] 4.5 Modify `Explorer.explore()` to run examples before random generation
- [ ] 4.6 Ensure examples are type-safe and match scenario record type
- [ ] 4.7 Track example execution separately in statistics

## 5. Verbose Mode (Fluent API)
- [ ] 5.1 Add `.verbose()` method to `FluentCheck` class
- [ ] 5.2 Create `FluentCheckVerbose` node class
- [ ] 5.3 Modify `#resolveExecutionConfig()` to detect verbose node
- [ ] 5.4 Set `CheckOptions.verbose = true` when verbose node present
- [ ] 5.5 Ensure backward compatibility with `CheckOptions.verbose`

## 6. Integration & Testing
- [ ] 6.1 Add unit tests for path tracking in various scenarios
- [ ] 6.2 Add unit tests for replay API with valid/invalid paths
- [ ] 6.3 Add unit tests for regression examples (single and multiple)
- [ ] 6.4 Add unit tests for `.verbose()` method
- [ ] 6.5 Add integration tests combining all features
- [ ] 6.6 Test path format edge cases (empty path, single quantifier, etc.)
- [ ] 6.7 Test replay with mismatched path lengths (should error gracefully)

## 7. Documentation
- [ ] 7.1 Add JSDoc comments for all new methods
- [ ] 7.2 Update README with reproducibility examples
- [ ] 7.3 Document path format specification
- [ ] 7.4 Add examples showing replay workflow
- [ ] 7.5 Document regression examples best practices
- [ ] 7.6 Update `docs/fluent-api.md` with new methods

## 8. Validation
- [ ] 8.1 Run `openspec validate add-reproducibility --strict`
- [ ] 8.2 Run `npm test` to ensure all tests pass
- [ ] 8.3 Verify backward compatibility (no breaking changes)
