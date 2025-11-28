# Tasks: Add Coverage Requirements

## 1. Statistics Extension

- [ ] 1.1 Define CoverageResult interface
- [ ] 1.2 Add `coverageResults?: CoverageResult[]` to FluentStatistics

## 2. Coverage Chain

- [ ] 2.1 Create FluentCheckCoverage class extending FluentCheckClassify
- [ ] 2.2 Store coverage requirements in chain
- [ ] 2.3 Implement `andCover()` for chaining multiple requirements

## 3. Coverage Methods

- [ ] 3.1 Add `cover(percentage, predicate, label)` to FluentCheck
- [ ] 3.2 Validate percentage is 0-100
- [ ] 3.3 Add `coverTable(name, categories, getCategory)` method
- [ ] 3.4 Generate multiple requirements from table

## 4. Statistical Verification

- [ ] 4.1 Implement Wilson score confidence interval calculation
- [ ] 4.2 Add `wilsonScoreInterval(successes, total, confidence)` function
- [ ] 4.3 Implement coverage requirement verification
- [ ] 4.4 Coverage satisfied when lower bound of CI >= required percentage

## 5. checkCoverage Terminal

- [ ] 5.1 Add `checkCoverage(options?)` method
- [ ] 5.2 Define CheckCoverageOptions interface (confidence, maxTests, continueOnFailure)
- [ ] 5.3 Run tests until all requirements met with confidence
- [ ] 5.4 Return CoverageResult array in statistics
- [ ] 5.5 Throw error with details if requirements not met

## 6. Testing

- [ ] 6.1 Test single coverage requirement
- [ ] 6.2 Test multiple coverage requirements
- [ ] 6.3 Test coverage table functionality
- [ ] 6.4 Test Wilson score interval calculation
- [ ] 6.5 Test coverage verification passes correctly
- [ ] 6.6 Test coverage verification fails correctly
- [ ] 6.7 Test error message includes failed requirements
- [ ] 6.8 Verify existing tests continue to pass

## 7. Documentation

- [ ] 7.1 Add coverage examples to documentation
- [ ] 7.2 Update API docs
- [ ] 7.3 Update CHANGELOG

## Acceptance Criteria

- [ ] Coverage requirements are tracked correctly
- [ ] Wilson score interval is calculated correctly
- [ ] checkCoverage() continues until requirements met
- [ ] Failure message includes which requirements failed
- [ ] Performance overhead < 10% for 3 requirements
