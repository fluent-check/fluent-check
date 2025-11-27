# Tasks: Add Test Case Classification

## 1. Statistics Extension

- [ ] 1.1 Add `labels?: Record<string, number>` to FluentStatistics
- [ ] 1.2 Add `labelPercentages?: Record<string, number>` to FluentStatistics

## 2. Classification Chain

- [ ] 2.1 Create FluentCheckClassify class extending FluentCheck
- [ ] 2.2 Store classification predicate and label in chain
- [ ] 2.3 Implement `and()` for chaining multiple classifications
- [ ] 2.4 Ensure proper type inference through classification chain

## 3. Classification Methods

- [ ] 3.1 Add `classify(predicate, label)` to FluentCheck
- [ ] 3.2 Add `label(fn)` for dynamic labeling
- [ ] 3.3 Add `collect(fn)` for value aggregation

## 4. Strategy Integration

- [ ] 4.1 Add label tracking Map to strategy state
- [ ] 4.2 Evaluate classification predicates after each test
- [ ] 4.3 Increment label counters
- [ ] 4.4 Calculate percentages at test completion
- [ ] 4.5 Include labels in final statistics

## 5. Testing

- [ ] 5.1 Test single classification
- [ ] 5.2 Test multiple chained classifications
- [ ] 5.3 Test overlapping labels (one test with multiple labels)
- [ ] 5.4 Test label distribution accuracy
- [ ] 5.5 Test dynamic labeling with label()
- [ ] 5.6 Test value collection with collect()
- [ ] 5.7 Test type inference through classify chain
- [ ] 5.8 Verify existing tests continue to pass

## 6. Documentation

- [ ] 6.1 Add classification examples to documentation
- [ ] 6.2 Update API docs
- [ ] 6.3 Update CHANGELOG

## Acceptance Criteria

- [ ] Classification predicates are evaluated correctly
- [ ] Labels accumulate across multiple tests
- [ ] Percentages are calculated correctly
- [ ] Type inference works through classify chain
- [ ] Performance overhead < 5% for 3 classifications
