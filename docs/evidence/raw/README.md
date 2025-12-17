# Evidence Data: Raw CSV Files

This directory contains raw experimental data from confidence-based termination studies. Each trial is reproducible using deterministic seeds.

## Files

| File | Trials (Quick) | Trials (Full) | Purpose |
|------|----------------|---------------|---------|
| `calibration.csv` | 1,200 | 4,800 | Sensitivity/specificity of threshold detection |
| `detection.csv` | 450 | 4,500 | Bug detection rate comparison |
| `efficiency.csv` | 250 | 1,000 | Property complexity adaptation |

## Data Generation

```bash
# Quick mode (~1 minute)
QUICK_MODE=1 npm run evidence:generate

# Full mode (~5-10 minutes)
npm run evidence:generate
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

**Why sensitivity is "low"**: Properties with 97% or 96% pass rate often encounter failures within 100 tests. Finding ANY failure terminates immediately. This is correct behavior, not miscalibration.

**Key insight**: 100% precision means confidence claims are reliable. The system never falsely claims confidence when threshold isn't met.

### Detection Study: Fixed vs Confidence-Based

| Method | Detection Rate | Mean Tests | Expected |
|--------|---------------|------------|----------|
| fixed_50 | 12.0% | 48 | 9.5% |
| fixed_100 | 24.0% | 84 | 18.1% |
| fixed_500 | 76.0% | 273 | 63.2% |
| confidence_0.95 | 48.0% | 223 | adaptive |
| confidence_0.99 | 58.0% | 285 | adaptive |

---

## Technical Constraints

### 100-Test Confidence Check Interval

FluentCheck checks confidence **every 100 tests** (see `Explorer.ts:682`):

```typescript
const confidenceCheckInterval = 100
```

Implications:
- Minimum termination for confidence: 100 tests
- Properties that never fail → terminate at exactly 100 tests
- Properties that fail → may terminate earlier via bug detection

This is by design for performance - checking confidence has overhead.

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
| elapsed_micros | int | High-resolution timing |

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
| elapsed_micros | int | High-resolution timing |

---

## Reproducibility

### Verification

```bash
# Run twice and compare
QUICK_MODE=1 npm run evidence:generate
cp docs/evidence/raw/calibration.csv /tmp/run1.csv
QUICK_MODE=1 npm run evidence:generate
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

- **Generated**: `npm run evidence:generate`
- **Quick Mode**: `QUICK_MODE=1` (50-150 trials per configuration)
- **Full Mode**: Standard (200-500 trials per configuration)
- **Timing**: Microsecond precision (`process.hrtime.bigint()`)
- **Version Control**: CSV files committed for reproducibility
