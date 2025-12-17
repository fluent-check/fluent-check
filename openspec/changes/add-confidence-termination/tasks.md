## 1. Strategy Configuration

- [ ] 1.1 Add `withConfidence(level: number)` to `FluentStrategyFactory`
- [ ] 1.2 Add `withMinConfidence(level: number)` to `FluentStrategyFactory`
- [ ] 1.3 Add `withPassRateThreshold(threshold: number)` to `FluentStrategyFactory` (default 0.999)
- [ ] 1.4 Add `withMaxIterations(count: number)` for upper bound safety
- [ ] 1.5 Validate confidence levels and thresholds (0 < value < 1)

## 2. Statistics Enhancement

- [ ] 2.1 Add `confidence: number` to `FluentStatistics`
- [ ] 2.2 Add `credibleInterval: [number, number]` to `FluentStatistics`
- [ ] 2.3 Implement Bayesian confidence calculation using Beta distribution
- [ ] 2.4 Calculate credible interval from posterior distribution
- [ ] 2.5 Propagate `passRateThreshold` from factory config to confidence calculation

## 3. Termination Logic

- [ ] 3.1 Implement confidence-based termination check in Explorer
- [ ] 3.2 Implement minimum confidence continuation logic
- [ ] 3.3 Handle edge cases (first few samples, all failures)
- [ ] 3.4 Add safety upper bound to prevent infinite loops
- [ ] 3.5 Pass `passRateThreshold` through ExplorationBudget to termination checks

## 4. Terminal Method

- [ ] 4.1 Add `checkWithConfidence(level: number, options?)` method
- [ ] 4.2 Preserve full factory configuration (shrinking, bias, deduping, cache, seed, etc.)
- [ ] 4.3 Only override confidence-related settings, not entire factory

## 5. Testing

- [ ] 5.1 Test termination occurs when confidence threshold reached (verify early termination)
- [ ] 5.2 Test continuation when confidence below minimum (verify extends past sample size)
- [ ] 5.3 Test that higher confidence levels require more tests (statistical guarantee)
- [ ] 5.4 Test that stricter pass-rate thresholds produce lower confidence (same data)
- [ ] 5.5 Test that `checkWithConfidence()` preserves factory configuration
- [ ] 5.6 Test statistics output accuracy (confidence and credible interval)
- [ ] 5.7 Test edge cases (immediate failure, very low confidence, no tests)
- [ ] 5.8 Test with `exists` quantifiers (confidence should work for existential properties)
- [ ] 5.9 Test that shrinking still works with confidence-based termination
- [ ] 5.10 Verify performance overhead is acceptable (<5%)

## 6. Documentation

- [ ] 6.1 Document confidence-based API in user guide
- [ ] 6.2 Add examples for common confidence levels
- [ ] 6.3 Explain Bayesian model in technical docs
