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

## 6. Evidence Suite: Statistical Foundation (Integers)

- [x] 6.1 Add seeded PRNG helper (mulberry32) if not already available
- [x] 6.2 Add deterministic test: confidence finds rare bug that fixed samples miss (0.2% failure rate)
- [x] 6.3 Add statistical test: confidence finds rare bugs more reliably across 100 trials
- [x] 6.4 Add deterministic test: low confidence predicts undiscovered bugs (1% failure rate property)
- [x] 6.5 Add statistical test: confidence calibration matches actual defect probability
- [x] 6.6 Add deterministic test: adaptive test effort based on property complexity

## 7. Evidence Suite: Real-World Scenarios (Complex Types)

- [x] 7.1 Add test: User registration validation bug (Record with email, age, username, role)
  - Property fails when email domain is 'test.com' AND role is 'admin' AND age > 65
  - Demonstrate confidence-based testing finds rare field combination bugs
  
- [x] 7.2 Add test: API request validation bug (Nested Record with method, headers, body)
  - Property fails when POST + body present + contentType undefined
  - Demonstrate comprehensive exploration of nested structures
  
- [x] 7.3 Add test: Date range business logic bug (Date + timezone combinations)
  - Property fails for Feb 29 + year-crossing + non-UTC timezone
  - Demonstrate edge case discovery in temporal logic
  
- [x] 7.4 Add test: Configuration validation bug (Deeply nested Record)
  - Property fails when sqlite + ssl + cache enabled + analytics enabled
  - Demonstrate invalid combination detection in complex config spaces

## 8. Documentation

- [x] 8.1 Document confidence-based API in user guide
- [x] 8.2 Add examples for common confidence levels
- [x] 8.3 Explain Bayesian model in technical docs
- [x] 8.4 Add evidence summary to docs/statistical-confidence.md
  - Include comparison table (fixed vs confidence-based)
  - Include real-world scenario examples
  - Explain when to use confidence vs fixed sample size
