# Tasks: Add Confidence-Based Termination

## 1. Statistics Extension

- [ ] 1.1 Add `confidence?: number` to FluentStatistics
- [ ] 1.2 Add `credibleInterval?: [number, number]` to FluentStatistics

## 2. Bayesian Confidence Calculation

- [ ] 2.1 Implement `calculateConfidence(n, k, epsilon)` using Beta distribution
- [ ] 2.2 Use uniform prior Beta(1, 1) by default
- [ ] 2.3 Calculate posterior Beta(n - k + 1, k + 1)
- [ ] 2.4 Confidence = P(θ > 1 - ε) from posterior

## 3. Credible Interval

- [ ] 3.1 Implement `equalTailedCredibleInterval(n, k, width)`
- [ ] 3.2 Use Beta quantile functions from jstat
- [ ] 3.3 Default to 95% credible interval

## 4. Strategy Configuration

- [ ] 4.1 Add `withConfidence(level)` to FluentStrategyFactory
- [ ] 4.2 Add `withMinConfidence(level)` to FluentStrategyFactory
- [ ] 4.3 Store confidence configuration in strategy
- [ ] 4.4 Validate level is between 0 and 1

## 5. Confidence-Based Stopping

- [ ] 5.1 Modify strategy execution to check confidence periodically
- [ ] 5.2 Use batched checking (every 100-1000 tests) for efficiency
- [ ] 5.3 Stop when target confidence achieved
- [ ] 5.4 Stop when max iterations reached
- [ ] 5.5 Continue past sample size if minConfidence not met

## 6. checkWithConfidence Terminal

- [ ] 6.1 Add `checkWithConfidence(level, options?)` method
- [ ] 6.2 Define ConfidenceOptions interface (maxTests, credibleIntervalWidth)
- [ ] 6.3 Return result with confidence statistics

## 7. Edge Cases

- [ ] 7.1 Handle case where counterexample found (confidence = 0)
- [ ] 7.2 Handle case where no tests run
- [ ] 7.3 Handle case where all tests fail
- [ ] 7.4 Handle numerical precision for very high confidence

## 8. Testing

- [ ] 8.1 Test confidence calculation against known values
- [ ] 8.2 Test credible interval calculation
- [ ] 8.3 Test stopping behavior with withConfidence
- [ ] 8.4 Test continuation behavior with withMinConfidence
- [ ] 8.5 Test checkWithConfidence terminal
- [ ] 8.6 Test edge cases (0 failures, all failures)
- [ ] 8.7 Verify existing tests continue to pass

## 9. Documentation

- [ ] 9.1 Add confidence examples to documentation
- [ ] 9.2 Explain Bayesian interpretation
- [ ] 9.3 Update API docs
- [ ] 9.4 Update CHANGELOG

## Acceptance Criteria

- [ ] Confidence calculation matches expected values
- [ ] Credible intervals are statistically correct
- [ ] Testing stops when confidence achieved
- [ ] Results include accurate confidence metrics
- [ ] Performance overhead < 5%
