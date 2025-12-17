## 1. Strategy Configuration

- [x] 1.1 Add `withConfidence(level: number)` to `FluentStrategyFactory`
- [x] 1.2 Add `withMinConfidence(level: number)` to `FluentStrategyFactory`
- [x] 1.3 Add `withPassRateThreshold(threshold: number)` to `FluentStrategyFactory` (default 0.999)
- [x] 1.4 Add `withMaxIterations(count: number)` for upper bound safety
- [x] 1.5 Validate confidence levels and thresholds (0 < value < 1)

## 2. Statistics Enhancement

- [x] 2.1 Add `confidence: number` to `FluentStatistics`
- [x] 2.2 Add `credibleInterval: [number, number]` to `FluentStatistics`
- [x] 2.3 Implement Bayesian confidence calculation using Beta distribution
- [x] 2.4 Calculate credible interval from posterior distribution
- [x] 2.5 Propagate `passRateThreshold` from factory config to confidence calculation

## 3. Termination Logic

- [x] 3.1 Implement confidence-based termination check in Explorer
- [x] 3.2 Implement minimum confidence continuation logic
- [x] 3.3 Handle edge cases (first few samples, all failures)
- [x] 3.4 Add safety upper bound to prevent infinite loops
- [x] 3.5 Pass `passRateThreshold` through ExplorationBudget to termination checks

## 4. Terminal Method

- [x] 4.1 Add `checkWithConfidence(level: number, options?)` method
- [x] 4.2 Preserve full factory configuration (shrinking, bias, deduping, cache, seed, etc.)
- [x] 4.3 Only override confidence-related settings, not entire factory

## 5. Testing

- [x] 5.1 Test termination occurs when confidence threshold reached (verify early termination)
- [x] 5.2 Test continuation when confidence below minimum (verify extends past sample size)
- [x] 5.3 Test that higher confidence levels require more tests (statistical guarantee)
- [x] 5.4 Test that stricter pass-rate thresholds produce lower confidence (same data)
- [x] 5.5 Test that `checkWithConfidence()` preserves factory configuration
- [x] 5.6 Test statistics output accuracy (confidence and credible interval)
- [x] 5.7 Test edge cases (immediate failure, very low confidence, no tests)
- [x] 5.8 Test with `exists` quantifiers (confidence should work for existential properties)
- [x] 5.9 Test that shrinking still works with confidence-based termination
- [x] 5.10 Verify performance overhead is acceptable (<5%)

## 6. Documentation

- [ ] 6.1 Document confidence-based API in user guide
- [ ] 6.2 Add examples for common confidence levels
- [ ] 6.3 Explain Bayesian model in technical docs
