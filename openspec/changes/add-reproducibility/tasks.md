# Tasks: Add Reproducibility Features

## 1. Path Tracking Infrastructure
- [ ] 1.1 Define `GenerationPath` type as string (e.g., `"42:7:s3"`)
- [ ] 1.2 Add path building utilities: `parsePath()`, `formatPath()`
- [ ] 1.3 Extend `FluentStrategy` to track `currentPath` during iteration
- [ ] 1.4 Capture `pickNum` for each quantifier into path segments
- [ ] 1.5 Track shrink depth and append `:s<depth>` suffix during shrinking
- [ ] 1.6 Add unit tests for path format and parsing

## 2. Enhanced FluentResult
- [ ] 2.1 Add `path?: string` property to `FluentResult` class
- [ ] 2.2 Update `check()` to capture and return path alongside seed
- [ ] 2.3 Update `assertSatisfiable()` error message to include path and replay hint
- [ ] 2.4 Update `assertNotSatisfiable()` error message to include path
- [ ] 2.5 Update `assertExample()` error message to include path
- [ ] 2.6 Add unit tests for path inclusion in all result scenarios

## 3. Replay API
- [ ] 3.1 Add `ReplayOptions` type: `{ seed: number, path?: string }`
- [ ] 3.2 Add `replay(options: ReplayOptions)` method to `FluentCheck`
- [ ] 3.3 Implement path-guided generation that jumps to specific sample indices
- [ ] 3.4 Validate path indices don't exceed sample collection sizes
- [ ] 3.5 Validate path format and throw descriptive errors for malformed paths
- [ ] 3.6 Handle shrink suffix (`:sN`) to replay shrinking steps
- [ ] 3.7 Add unit tests for exact reproduction via replay

## 4. Regression Examples API
- [ ] 4.1 Add `withExample<Rec>(example: Partial<Rec>)` method with proper type inference
- [ ] 4.2 Add `withExamples<Rec>(examples: Partial<Rec>[])` method
- [ ] 4.3 Store examples in strategy for injection before random generation
- [ ] 4.4 Execute examples in order before random samples
- [ ] 4.5 Ensure partial examples work: provided vars fixed, others random
- [ ] 4.6 Ensure type inference flows from bound variables (forall/exists/given)
- [ ] 4.7 Add compile-time type tests for incorrect example types
- [ ] 4.8 Add unit tests for single example, multiple examples, partial examples

## 5. Verbose/Debug Mode
- [ ] 5.1 Add `VerboseOptions` type: `{ logger?: (msg: string) => void }`
- [ ] 5.2 Add `verbose(options?: VerboseOptions)` method to `FluentCheck`
- [ ] 5.3 Log each test case: `[fluent-check] Test case N: {...} (path: "...") ✓/✗`
- [ ] 5.4 Log shrinking steps: `[fluent-check] Shrink step N: {...} (path: "...") ✓/✗`
- [ ] 5.5 Log final counterexample with replay suggestion
- [ ] 5.6 Support custom logger function
- [ ] 5.7 Add unit tests for verbose output format

## 6. Documentation & Integration
- [ ] 6.1 Add JSDoc comments to `replay()`, `withExample()`, `withExamples()`, `verbose()`
- [ ] 6.2 Update README with reproducibility section and examples
- [ ] 6.3 Add example test file: `test/reproducibility.test.ts`
