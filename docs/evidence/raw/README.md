# Evidence Data: Raw CSV Files

This directory contains raw experimental data from confidence-based termination studies. Each trial is reproducible using deterministic seeds.

## Files

| File | Trials (Quick) | Trials (Full) | Purpose |
|------|----------------|---------------|---------|
| `calibration.csv` | 1,200 | 4,800 | Sensitivity/specificity of threshold detection |
| `detection.csv` | 450 | 4,500 | Bug detection rate comparison |
| `efficiency.csv` | 250 | 1,000 | Property complexity adaptation |
| `exists.csv` | 1,200 | 4,800 | Existential quantifier witness detection |
| `shrinking.csv` | 1,500 | 10,000 | Shrinking effectiveness and minimal-witness rate |
| `double_negation.csv` | 600 | 2,400 | First-class `.exists()` vs double-negation equivalence |
| `composition.csv` | 30 | 100 | Composition complexity (exists-forall pattern) |

## Data Generation

```bash
# Quick mode (~5 seconds)
npm run evidence:quick

# Full mode (~15-30 seconds)
npm run evidence
```

**Reproducibility**: All experiments use deterministic seeds (`seed = trial_id * 7919`), ensuring identical results on every run.

---

## Key Findings

### ✅ Timing Now Useful (Microseconds)

Previous issue: 99%+ of trials completed in ≤1ms.  
**Fixed**: Now using `process.hrtime.bigint()` for microsecond precision.

| Study | Range | Mean | Unique Values |
|-------|-------|------|---------------|
| Calibration | 20-3,088 µs | 65 µs | 176 |
| Detection | 21-35,806 µs | 468 µs | 285 |
| Efficiency | 28-2,260 µs | 166 µs | 96 |

### ✅ Efficiency Study Shows Clear Adaptation

**Constraint**: FluentCheck checks confidence every 100 tests (minimum termination point).

| Property | Pass Rate | Mean Tests | Bug Found % | Interpretation |
|----------|-----------|------------|-------------|----------------|
| always_true | 100% | 100 | 0% | Terminates at first check |
| rare_failure | 99.9% | 93 | 12% | Usually achieves confidence |
| uncommon_failure | 99.5% | 79 | 30% | Mixed termination |
| common_failure | 99% | 67 | 54% | Often finds bug early |
| frequent_failure | 95% | 19 | 100% | Always finds bug early |

**Conclusion**: Clear adaptation - higher failure rates → faster termination via bug detection.

### ✅ Calibration Study: High Specificity, Expected Sensitivity

The calibration study measures sensitivity (TPR) and specificity (TNR) of threshold detection:

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Sensitivity | 46.4% | When threshold met, 46% achieve confidence |
| Specificity | 100% | When threshold NOT met, 100% find bugs |
| Precision | 100% | When confidence claimed, 100% correct |
| False Positives | 0 | Never claims confidence incorrectly |

**Why sensitivity is "low"**: Properties with 97% or 96% pass rate often encounter failures within 100 tests. Finding ANY failure terminates immediately. This is **correct behavior**, not miscalibration.

> **Key Insight (IMPORTANT)**: The "low" sensitivity is intentional. FluentCheck prioritizes finding bugs over claiming confidence. For a property at 97% pass rate with 95% threshold, running 100 tests has ~95% chance of finding a failure. Finding a bug is more valuable than claiming confidence — this is exactly what you want in a testing tool.

**100% precision** means confidence claims are reliable. The system never falsely claims confidence when threshold isn't met.

### Detection Study: Fixed vs Confidence-Based

| Method | Detection Rate | Mean Tests | Mean Time (ms) | ROI (bugs/sec) |
|--------|---------------|------------|----------------|----------------|
| fixed_50 | 12.0% | 48 | 0.07 | 1,326 |
| fixed_100 | 24.0% | 84 | 0.07 | 2,487 |
| fixed_500 | 76.0% | 273 | 0.21 | 2,889 |
| fixed_1000 | 86.2% | 442 | 0.27 | 3,219 |
| confidence_0.95 | 48.0% | 223 | 0.16 | 2,937 |
| confidence_0.99 | 58.0% | 285 | 0.17 | **3,574** |

**ROI Analysis**: `confidence_0.99` is the most time-efficient method at 3,574 bugs/sec, despite `fixed_1000` having higher absolute detection rate.

---

## Technical Constraints

### Confidence Check Interval (Configurable)

FluentCheck checks confidence at configurable intervals (default: **100 tests**).

```typescript
// Default behavior
const confidenceCheckInterval = budget.confidenceCheckInterval ?? 100

// Can be configured:
fc.strategy()
  .withConfidence(0.95)
  .withConfidenceCheckInterval(50)  // Check every 50 tests
```

Implications:
- Minimum termination for confidence: equal to check interval (default 100)
- Properties that never fail → terminate at exactly the interval
- Properties that fail → may terminate earlier via bug detection

This is configurable to balance responsiveness vs computational overhead.

---

## Study Parameter Choices

The three studies intentionally use different threshold values for different purposes:

| Study | Threshold | Purpose |
|-------|-----------|---------|
| **Calibration** | 0.95 | Tests sensitivity/specificity at a discriminating threshold that creates clear "above" and "below" scenarios |
| **Efficiency** | 0.80 | Low threshold ensures confidence is achievable quickly, demonstrating adaptation behavior |
| **Detection** | ~0.99 | Threshold just below true pass rate (0.998) to focus on bug detection dynamics |

**Why not use the same threshold?**

Each study measures a different aspect of confidence-based termination:

1. **Calibration Study**: Needs a threshold that creates meaningful "above threshold" (96-100%) and "below threshold" (80-94%) scenarios. A 95% threshold provides good separation.

2. **Efficiency Study**: Tests how quickly properties terminate. A low threshold (80%) ensures that even moderately buggy properties (95% pass rate) can achieve confidence, demonstrating the adaptation mechanism.

3. **Detection Study**: Uses threshold slightly below the true pass rate to make confidence achievable while still testing bug detection. This isolates the detection question from the threshold question.

Using identical thresholds would conflate different phenomena and make results harder to interpret.

---

## CSV Schemas

### calibration.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| tests_run | int | Number of tests executed |
| bug_found | bool | Whether property failed |
| claimed_confidence | float | Computed confidence [0,1] |
| true_pass_rate | float | Known true pass rate |
| threshold | float | Decision threshold (0.95) |
| target_confidence | float | Target confidence level |
| threshold_actually_met | bool | Whether true_pass_rate > threshold |
| termination_reason | enum | 'confidence', 'bugFound', 'maxIterations' |
| elapsed_micros | int | High-resolution timing |
| outcome | enum | 'TP', 'FN', 'TN', 'FP' (sensitivity/specificity) |

### detection.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| tests_run | int | Number of tests executed |
| bug_found | bool | Whether bug was detected |
| claimed_confidence | float | Computed confidence level |
| method | enum | 'fixed_N' or 'confidence_X' |
| bug_failure_rate | float | True failure rate (0.002) |
| expected_bug_per | int | Expected tests per bug (500) |
| termination_reason | enum | 'sampleSize', 'bugFound', 'confidence' |
| elapsed_micros | int | High-resolution timing (for ROI analysis) |

**Performance Metrics** (from `elapsed_micros`):
- Time per test: ~0.6-0.8 µs (remarkably consistent)
- Overhead of confidence checking: negligible
- Cost per bug: 0.28-0.31 ms depending on method

### efficiency.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| tests_run | int | Number of tests executed |
| bug_found | bool | Whether property failed |
| claimed_confidence | float | Computed confidence level |
| property_type | enum | 'always_true', 'rare_failure', etc. |
| true_pass_rate | float | Known pass rate [0,1] |
| target_confidence | float | Target confidence (0.95) |
| pass_rate_threshold | float | Threshold for confidence (0.80) |
| termination_reason | enum | 'confidence', 'bugFound', 'maxIterations' |
| elapsed_micros | int | High-resolution timing (for ROI analysis) |

**Performance Metrics** (from `elapsed_micros`):
- Average time per test: 1.34 µs
- Early bug detection saves 49.3% time vs running to confidence
- Frequent failures (95% pass): 62.7% faster via early termination

### exists.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| scenario | enum | 'sparse', 'rare', 'moderate', 'dense', 'exists_forall', 'forall_exists' |
| witness_density | float | Expected proportion of valid witnesses |
| sample_size | int | Max tests configured |
| witness_found | bool | Whether a witness was found |
| tests_run | int | Number of tests executed |
| elapsed_micros | int | High-resolution timing |
| witness_value | string | JSON-serialized witness (if found) |

**Scenario Details:**

Uses large ranges (1M values) with modular arithmetic to avoid birthday paradox effects.

| Scenario | Density | Description |
|----------|---------|-------------|
| sparse | 0.01% | Find x where `x % 10000 === 0` in [1, 1M] |
| rare | 1% | Find x where `x % 100 === 0` in [1, 1M] |
| moderate | 10% | Find x where `x % 10 === 0` in [1, 1M] |
| dense | 50% | Find even x (`x % 2 === 0`) in [1, 1M] |
| exists_forall | ~50% | Find a ≥ 501000 such that a + b ≥ 500000 for all b ∈ [-1000, 1000] |
| forall_exists | 0.01%/a | For each a ∈ [1,10], find b ∈ [1,10000] such that a + b = 1000 |

**Expected Detection Rate:**

For a witness density `d` and sample size `n`:
```
P(find witness) = 1 - (1 - d)^n
```

---

### shrinking.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| scenario | enum | Shrinking scenario name |
| witness_found | bool | Whether a witness was found |
| initial_witness | int | Witness before shrinking (currently blank; reserved) |
| final_witness | int | Witness after shrinking |
| expected_minimal | int | Theoretical minimal witness for the scenario |
| is_minimal | bool | Whether `final_witness` equals `expected_minimal` |
| shrink_candidates_tested | int | Shrink candidates evaluated |
| shrink_rounds_completed | int | Shrinking rounds executed |
| shrink_improvements_made | int | Successful improvements accepted |
| exploration_time_ms | int | Time spent exploring (ms) |
| shrinking_time_ms | int | Time spent shrinking (ms) |
| total_elapsed_micros | int | End-to-end time (µs) |

### double_negation.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| scenario | enum | Witness-density scenario name |
| approach | enum | 'first_class' or 'double_negation' |
| witness_density | float | Expected witness density |
| sample_size | int | Max tests configured |
| witness_found | bool | Whether a witness was found |
| tests_run | int | Number of tests executed |
| elapsed_micros | int | High-resolution timing |
| witness_value | int | Witness value (if found) |
| shrink_candidates_tested | int | Shrink candidates evaluated |
| shrink_improvements_made | int | Successful improvements accepted |

### composition.csv

| Column | Type | Description |
|--------|------|-------------|
| trial_id | int | Unique trial identifier |
| seed | int | Deterministic seed |
| approach | enum | 'first_class' or 'double_negation' |
| witness_found | bool | Whether a witness was found |
| tests_run | int | Number of tests executed |
| elapsed_micros | int | High-resolution timing |
| a_value | int | Found witness for `a` (if found) |
| lines_of_code | int | Rough ergonomics proxy for the approach |

---

## Reproducibility

### Verification

```bash
# Run twice and compare
npm run evidence:quick
cp docs/evidence/raw/calibration.csv /tmp/run1.csv
npm run evidence:quick
diff /tmp/run1.csv docs/evidence/raw/calibration.csv
# Output: (no differences - deterministic)
```

### Seed Formula

```
seed = trial_id * 7919
```

Where 7919 is a prime number ensuring good distribution across trial IDs.

---

## Audit Trail

- **Generated**: `npm run evidence`
- **Quick Mode**: `npm run evidence:quick` (50-150 trials per configuration)
- **Full Mode**: Standard (200-500 trials per configuration)
- **Timing**: Microsecond precision (`process.hrtime.bigint()`)
- **Version Control**: CSV files committed for reproducibility
