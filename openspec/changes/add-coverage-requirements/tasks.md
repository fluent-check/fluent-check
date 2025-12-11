# Tasks: Add Coverage Requirements

## 1. Scenario AST Extensions

- [x] 1.1 Add `CoverNode<Rec>` interface to `src/Scenario.ts`
  - Fields: `type: 'cover'`, `predicate: (args: Rec) => boolean`, `label: string`, `requiredPercentage: number`
  - Extends classification concept with required percentage
- [x] 1.2 Add `CoverTableNode<Rec>` interface to `src/Scenario.ts`
  - Fields: `type: 'coverTable'`, `name: string`, `categories: Record<string, number>`, `getCategory: (args: Rec) => string`
  - Categories object maps category names to required percentages
- [x] 1.3 Update `ScenarioNode` union type to include new node types
- [x] 1.4 Update `createScenario()` to handle new node types (no special processing needed)

## 2. FluentCheck API Methods

- [x] 2.1 Add `cover(percentage, predicate, label)` method to `FluentCheck`
  - Returns new `FluentCheck` with cover node added
  - Type-safe: preserves `Rec` type parameter
  - Validates percentage is between 0 and 100
- [x] 2.2 Add `coverTable(name, categories, getCategory)` method to `FluentCheck`
  - Returns new `FluentCheck` with coverTable node added
  - Type-safe: preserves `Rec` type parameter
  - Validates categories object structure
- [x] 2.3 Add `checkCoverage(options?)` terminal method to `FluentCheck`
  - Executes tests (same as `check()`)
  - Verifies coverage requirements after execution
  - Options: `{ confidence?: number }` (default 0.95)
  - Returns `FluentResult` with coverage verification results
- [x] 2.4 Methods can be chained multiple times (multiple coverage requirements per scenario)
- [x] 2.5 Coverage methods work alongside existing classification methods

## 3. Statistics Interface Updates

- [x] 3.1 Add `CoverageResult` interface to `src/statistics.ts`
  - Fields: `label`, `requiredPercentage`, `observedPercentage`, `satisfied`, `confidenceInterval`, `confidence`
- [x] 3.2 Extend `FluentStatistics` interface in `src/statistics.ts`
  - Add optional `coverageResults?: CoverageResult[]` field
- [x] 3.3 Update JSDoc comments for new fields

## 4. Wilson Score Interval Implementation

- [x] 4.1 Implement `wilsonScoreInterval(successes, trials, confidence)` function in `src/statistics.ts`
  - Calculate Wilson score confidence interval for a proportion
  - Handle edge cases: zero successes, all successes, small sample sizes
  - Return `[lower, upper]` tuple
- [x] 4.2 Test Wilson score implementation with known test cases
  - Verify against reference implementations or published tables
  - Test edge cases (0%, 100%, small n)

## 5. Coverage Verification Logic

- [x] 5.1 Extract coverage nodes from scenario in `FluentCheck.checkCoverage()`
  - Filter scenario nodes for `type === 'cover' | 'coverTable'`
- [x] 5.2 Collect label counts for coverage requirements
  - Coverage nodes also act as classification nodes (count labels during execution)
  - Use existing label tracking infrastructure from classification
- [x] 5.3 Calculate observed percentages for each coverage requirement
  - `observedPercentage = (labelCount / testsRun) * 100`
- [x] 5.4 Verify each coverage requirement using Wilson score intervals
  - Calculate confidence interval for observed percentage
  - Check if required percentage is within interval
  - Set `satisfied: true/false` accordingly
- [x] 5.5 Handle coverage table requirements
  - Expand table into individual coverage requirements (one per category)
  - Use qualified labels (e.g., "sizes.empty", "sizes.small")
- [x] 5.6 Build `CoverageResult[]` array with verification results
- [x] 5.7 Handle edge cases:
  - No coverage requirements defined (coverageResults undefined)
  - Zero tests run (all requirements unsatisfied or undefined)
  - All tests discarded (use testsRun for percentages)

## 6. Integration with Classification

- [x] 6.1 Ensure coverage nodes are evaluated during test execution
  - Coverage nodes should be included in classification node extraction
  - Labels from coverage requirements should appear in `statistics.labels`
- [x] 6.2 Verify coverage requirements use same label counts as classification
  - Coverage verification should read from `explorationResult.labels`
  - No duplicate counting

## 7. Error Handling

- [x] 7.1 Handle invalid coverage percentages (< 0 or > 100)
  - Validate at method call time, throw descriptive error
- [x] 7.2 Handle invalid category names in coverTable
  - If getCategory returns non-existent category, log warning or error
- [x] 7.3 Handle coverage verification failures
  - `checkCoverage()` should throw error or return unsatisfiable result
  - Error message should list unsatisfied requirements

## 8. Testing

- [x] 8.1 Test `cover()` method with single requirement
- [x] 8.2 Test `cover()` method with multiple requirements
- [x] 8.3 Test `coverTable()` method with multiple categories
- [x] 8.4 Test `checkCoverage()` with satisfied requirements
- [x] 8.5 Test `checkCoverage()` with unsatisfied requirements (should fail)
- [x] 8.6 Test Wilson score interval calculation accuracy
- [x] 8.7 Test coverage verification with different confidence levels
- [x] 8.8 Test coverage with preconditions (discarded tests)
- [x] 8.9 Test coverage with unsatisfiable properties
- [x] 8.10 Test edge cases: zero tests, all discarded, no requirements
- [x] 8.11 Test coverage requirements work with existing classifications
- [x] 8.12 Test coverage table category validation

## 9. Documentation

- [x] 9.1 Add JSDoc comments to new methods
- [ ] 9.2 Add examples to README or docs
- [ ] 9.3 Document Wilson score interval approach
- [ ] 9.4 Update CHANGELOG

## Acceptance Criteria

- [x] `cover()` and `coverTable()` methods are available on `FluentCheck`
- [x] `checkCoverage()` method executes tests and verifies requirements
- [x] `result.statistics.coverageResults` contains accurate verification results
- [x] Coverage verification uses Wilson score confidence intervals correctly
- [x] Unsatisfied requirements cause `checkCoverage()` to fail appropriately
- [x] Coverage requirements work with existing classification infrastructure
- [x] Performance overhead is < 10% for typical use cases
- [x] All existing tests continue to pass
