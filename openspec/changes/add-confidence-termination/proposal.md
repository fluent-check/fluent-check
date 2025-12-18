# Change: Add Confidence-Based Termination

> **GitHub Issue:** [#458](https://github.com/fluent-check/fluent-check/issues/458)

## Why

Currently, FluentCheck runs a fixed number of tests regardless of whether sufficient confidence has been achieved. This is suboptimal because:

1. **Over-testing**: Simple properties may reach 99.99% confidence long before the sample limit
2. **Under-testing**: Complex properties may need more samples than the fixed limit allows
3. **No statistical guarantee**: Users cannot specify "run until X% confident the property holds"

For critical systems, users need to specify confidence levels (e.g., "run until 99.9% confident") rather than arbitrary sample counts.

Issue [#418](https://github.com/fluent-check/fluent-check/issues/418) proposes adding Bayesian confidence-based termination using FluentCheck's existing Beta distribution statistics.

## What Changes

- **Add `withConfidence(level)` to strategy builder** for target confidence
- **Add `withMinConfidence(level)`** for minimum confidence threshold
- **Add `withPassRateThreshold(threshold)`** to configure the pass-rate threshold for confidence calculation (default 0.999)
- **Add `withMaxIterations(count)`** for safety upper bound
- **Add `checkWithConfidence(level)` terminal method** for one-shot confidence checks
  - **FIX**: Preserve full factory configuration (not just sampleSize)
- **Add `confidence` and `credibleInterval` to FluentStatistics** output
- **Implement Bayesian confidence calculation** using Beta distribution posterior

### API Design

```typescript
// Run until 99% confident (default: confidence that pass rate > 99.9%)
fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.99)
    .withMaxIterations(50000))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// Configure custom pass-rate threshold
fc.scenario()
  .config(fc.strategy()
    .withConfidence(0.95)
    .withPassRateThreshold(0.99))  // Confidence that pass rate > 99%
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()

// Minimum confidence - continue past sample size if confidence too low
fc.scenario()
  .config(fc.strategy()
    .withMinConfidence(0.95)
    .withSampleSize(1000))
  .forall('x', fc.integer())
  .then(({x}) => x >= 0)
  .check()

// One-shot terminal method (preserves existing factory config)
const result = fc.scenario()
  .config(fc.strategy().withShrinking().withBias())
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .checkWithConfidence(0.999)  // Preserves shrinking and bias settings

console.log(result.statistics.confidence)       // 0.9992
console.log(result.statistics.testsRun)         // 6905 (variable)
console.log(result.statistics.credibleInterval) // [0.9995, 1.0]
```

### Bayesian Confidence Model

Using Beta distribution posterior:
- Prior: Beta(1, 1) = Uniform (no prior knowledge)
- After n successes, m failures: Beta(n+1, m+1)
- Confidence = P(p > passRateThreshold | data) where p is true pass rate
- Default passRateThreshold = 0.999 (99.9% pass rate)
- Users can configure threshold via `withPassRateThreshold(threshold)`

```typescript
// Confidence that property holds with >99.9% probability (default)
const posterior = new BetaDistribution(successes + 1, failures + 1)
const confidence = 1 - posterior.cdf(0.999)

// Custom threshold: confidence that pass rate > 99%
const confidence99 = 1 - posterior.cdf(0.99)
```

**Semantics Clarification:**
- `withConfidence(0.95)` means "terminate when 95% confident that pass rate > threshold"
- `withPassRateThreshold(0.999)` means "calculate confidence assuming we need 99.9% pass rate"
- These are independent: confidence level (termination) vs pass-rate threshold (calculation)

## Impact

- **Affected specs**: `specs/statistics/spec.md`, `specs/strategies/spec.md`
- **Affected code**:
  - `src/strategies/FluentStrategyFactory.ts` - Configuration methods
  - `src/strategies/FluentStrategy.ts` - Termination logic
  - `src/statistics/FluentStatistics.ts` - Confidence calculation
  - `src/FluentCheck.ts` - New terminal method
- **Breaking change**: No - additive only, default behavior unchanged
- **Performance**: < 5% overhead for confidence calculation

## Complexity Estimate

**Medium Complexity** (1-2 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| Strategy configuration | Low | Builder methods |
| Confidence calculation | Medium | Beta distribution math |
| Termination logic | Medium | Integration with test loop |
| `checkWithConfidence()` | Low | Convenience wrapper |
| Test updates | Medium | Verify statistical properties |

## Success Criteria

### Implementation Criteria (Completed)

1. `withConfidence(0.99)` terminates when 99% confidence achieved
2. `withMinConfidence(0.95)` continues if confidence below threshold
3. `withPassRateThreshold(0.99)` affects confidence calculation (lower threshold = higher confidence for same data)
4. `checkWithConfidence()` preserves all factory configuration (shrinking, bias, deduping, etc.)
5. Statistics output includes confidence and credible interval
6. Tests verify statistical guarantees (higher confidence requires more tests, threshold affects confidence)
7. Performance overhead is minimal (<5%)

### Evidence Validation Criteria (In Progress)

8. **Rare Bug Detection**: Demonstrate that confidence-based testing finds bugs that fixed sample sizes miss
9. **Confidence Accuracy**: Prove that reported confidence correlates with actual defect probability
10. **Efficiency Comparison**: Show adaptive test effort (simple properties finish faster, complex ones get thorough testing)
11. **Real-World Value**: Validate with complex types (records, nested structures) not just integers

## Related Issues

- [#418](https://github.com/fluent-check/fluent-check/issues/418) - Original proposal
- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Performance improvements
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance baseline

## Independence

This proposal is **independent**:
- No dependency on shrinking changes
- Orthogonal to generation optimizations
- Self-contained statistical feature
- Builds on existing Beta distribution infrastructure

## Evidence Suite Requirements

The implementation is complete, but we need comprehensive evidence tests to validate the value proposition.

### Problem Statement

Current tests verify the **mechanics** work (API validation, config propagation) but don't demonstrate the **value**: that statistical confidence actually helps detect issues that fixed sample sizes might miss.

We have the "theory" and "intuition" but lack empirical "evidence" that:
1. Confidence-based testing catches rare bugs more reliably
2. Reported confidence accurately predicts defect risk
3. Test effort adapts appropriately to property complexity
4. The feature works with **complex types** (records, nested structures), not just integers

### Evidence Test Categories

#### 1. Statistical Foundation Tests (Integers)

These validate the mathematical correctness using simple integers:

- **Rare Bug Detection**: Property that fails 1/500 times (0.2% failure rate)
  - **Deterministic**: Seeded RNG shows confidence finds bug that 100 fixed samples miss
  - **Statistical**: 100 trials prove confidence finds bug >80% of time vs ~18% for fixed samples

- **Confidence Accuracy**: Property with known 1% failure rate
  - **Deterministic**: Low samples yield low confidence; high samples yield calibrated confidence
  - **Statistical**: At 90% confidence, bugs found in ~10% of "confident" runs (validates not over-confident)

- **Efficiency Comparison**: Simple vs complex properties
  - Simple property (always true): terminates <500 tests
  - Complex property (99% pass rate): runs >500 tests

#### 2. Real-World Scenario Tests (Complex Types)

These demonstrate why users need this feature with realistic examples:

**A. User Registration Validation (Record)**
```typescript
interface UserRegistration {
  email: string
  age: number
  username: string
  role: 'user' | 'admin' | 'moderator'
}
```
- **Hidden Bug**: Fails when email domain is 'test.com' AND role is 'admin' AND age > 65
- **Failure Rate**: ~0.1% of search space (rare combination)
- **Evidence**: Confidence-based testing finds it; fixed 200 samples rarely do

**B. API Request Validation (Nested Record)**
```typescript
interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  headers: { contentType?, authorization?, accept? }
  body?: Record<string, unknown>
}
```
- **Hidden Bug**: POST with body but contentType undefined causes crash
- **Evidence**: Comprehensive exploration finds the missing validation

**C. Date Range Business Logic (Dates + Timezone)**
```typescript
interface DateRange {
  start: Date
  end: Date
  timezone: string
}
```
- **Hidden Bug**: Leap year Feb 29 + year-crossing range + non-UTC timezone
- **Evidence**: Statistical exploration finds the edge case

**D. Configuration Validation (Deeply Nested)**
```typescript
interface AppConfig {
  database: { type, poolSize, ssl }
  cache: { enabled, ttl, strategy }
  features: { analytics, notifications, rateLimit }
}
```
- **Hidden Bug**: sqlite + ssl + cache enabled + analytics = invalid combination
- **Evidence**: Finds invalid config combinations that are easy to miss

### Expected Evidence Outcomes

| Scenario | Fixed 100-200 Samples | Confidence-Based | Insight |
|----------|----------------------|------------------|---------|
| Rare integer bug (0.2%) | ~18% detection | >80% detection | Math works |
| User registration bug | Often missed | Found reliably | Complex types matter |
| API request combination | Often missed | Found reliably | Nested structures need exploration |
| Date range edge case | Rarely found | Found with exploration | Temporal logic is tricky |
| Config combination | Often missed | Found reliably | Combinatorial spaces are vast |
| Simple property | 100 tests | <500 tests | Efficient on easy cases |
| Risky property | 100 tests | >500 tests | Thorough on hard cases |

### Value Proposition (Evidence-Based)

**Why confidence-based testing matters for complex types:**

1. **Combinatorial Explosion**: A record with 5 fields of 10 values each = 100,000 combinations. Fixed samples can't guarantee coverage.

2. **Hidden Failure Modes**: Bugs that only trigger on specific field combinations are statistically rare but dangerous in production.

3. **Actionable Confidence**: "95% confident this validator works" is more meaningful than "ran 100 tests" (which could be lucky or unlucky).

4. **Adaptive Effort**: Simple validators finish fast (efficient); complex ones get the exploration they need (thorough).

### Implementation Strategy

- **Deterministic Tests**: Use seeded PRNG (`mulberry32`) for reproducible CI tests
- **Statistical Tests**: Run 100 trials to validate probabilistic claims (can be marked `.skip` for CI speed)
- **Complex Type Tests**: Use existing FluentCheck arbitraries (`fc.record`, `fc.patterns.email`, `fc.date`, `fc.oneof`)
- **Documentation**: Update `docs/statistical-confidence.md` with evidence summary and examples

## Research Reference

See `docs/research/statistical-ergonomics/` for full research on statistical foundations and API design considerations.
