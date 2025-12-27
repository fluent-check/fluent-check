# Design: Statistical Apparatus Evidence Studies

## Context

Fluent-check uses sophisticated statistical machinery for sampling, size estimation, deduplication, and shrinking. The existing evidence suite validates confidence-based termination but leaves core mechanisms unvalidated. This design specifies 12 empirical studies to fill these gaps.

## Goals

- Validate statistical correctness of sampling strategies
- Quantify overhead/benefit trade-offs
- Identify optimization opportunities
- Establish publication-quality evidence

## Non-Goals

- Modifying core algorithms (separate proposals)
- Real-world benchmark suites (too variable)
- Comparison with other PBT frameworks (out of scope)

---

## Study Implementation Pattern

All new studies MUST follow the exact pattern established by existing studies. This section documents that pattern in detail.

### TypeScript Study File Structure

Each study file (`scripts/evidence/<study>.study.ts`) MUST follow this structure:

```typescript
/**
 * <Study Name>: <One-line description>
 *
 * <Multi-line explanation of what the study tests>
 *
 * IMPORTANT: <Key constraints or assumptions>
 *
 * What we measure:
 * 1. <Metric 1>
 * 2. <Metric 2>
 * ...
 */

import * as fc from '../../src/index.js'
import { CSVWriter, ProgressReporter, getSeed, getSampleSize, mulberry32, HighResTimer } from './runner.js'
import path from 'path'

// 1. Define result interface with ALL fields that will be in CSV
interface <Study>Result {
  trialId: number
  seed: number
  // ... all other measured fields
  elapsedMicros: number
}

// 2. Single trial function - MUST be deterministic given trialId
function runTrial(
  trialId: number,
  // ... configuration parameters
): <Study>Result {
  const seed = getSeed(trialId)  // ALWAYS use getSeed for reproducibility
  const timer = new HighResTimer()

  // Run the actual experiment...

  const elapsedMicros = timer.elapsedMicros()

  return {
    trialId,
    seed,
    // ... all measured values
    elapsedMicros
  }
}

// 3. Main study function - orchestrates all trials
async function run<Study>Study(): Promise<void> {
  console.log('=== <Study Name> ===')
  console.log('<Hypothesis statement>\n')

  const outputPath = path.join(process.cwd(), 'docs/evidence/raw/<study>.csv')
  const writer = new CSVWriter(outputPath)

  // Write CSV header - MUST match result interface exactly
  writer.writeHeader([
    'trial_id',
    'seed',
    // ... all columns in snake_case
    'elapsed_micros'
  ])

  // Study configuration - document all parameters
  const scenarios = [
    { name: '...', param: value },
    // ...
  ]

  const trialsPerConfig = getSampleSize(500, 100)  // Full mode, quick mode
  const totalTrials = scenarios.length * trialsPerConfig

  // Print study parameters
  console.log(`<Parameter>: <value>`)
  console.log(`Scenarios:`)
  for (const s of scenarios) {
    console.log(`  - ${s.name}: ...`)
  }
  console.log(`Trials per configuration: ${trialsPerConfig}`)
  console.log(`Total trials: ${totalTrials}\n`)

  const progress = new ProgressReporter(totalTrials, '<StudyName>')

  let trialId = 0
  for (const scenario of scenarios) {
    for (let i = 0; i < trialsPerConfig; i++) {
      const result = runTrial(trialId, scenario.param)

      writer.writeRow([
        result.trialId,
        result.seed,
        // ... all values matching header order
        result.elapsedMicros
      ])

      progress.update()
      trialId++
    }
  }

  progress.finish()
  await writer.close()

  console.log(`\n✓ <Study> study complete`)
  console.log(`  Output: ${outputPath}`)
}

// 4. CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  run<Study>Study()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

export { run<Study>Study }
```

### Python Analysis File Structure

Each analysis file (`analysis/<study>.py`) MUST follow this structure:

```python
#!/usr/bin/env python3
"""
<Study Name> Analysis: <One-line description>

<Multi-line explanation of what the analysis computes>

Metrics:
- <Metric 1>: <Description>
- <Metric 2>: <Description>

Generates:
- <figure1>.png: <Description>
- <figure2>.png: <Description>
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure, chi_squared_test

# Paths - ALWAYS use this pattern
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/<study>.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== <Study Name> Analysis ===\n")

    # 1. Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # 2. Compute aggregate statistics
    # ALWAYS use Wilson score intervals for proportions
    # ALWAYS report sample sizes

    # 3. Print summary table
    print("Summary Statistics:")
    print("=" * 60)
    # ... formatted table with metrics ...
    print("=" * 60)

    # 4. Statistical hypothesis tests
    # Use chi_squared_test() for proportion comparisons
    # Use scipy.stats for other tests
    # Report: test statistic, p-value, effect size (Cohen's h), interpretation

    # 5. Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))  # Or appropriate layout

    # Left panel
    ax1 = axes[0]
    # ... bar chart or box plot with error bars ...
    ax1.set_xlabel('...')
    ax1.set_ylabel('...')
    ax1.set_title('...')
    ax1.set_ylim(0, 1.05)  # For proportions
    ax1.axhline(y=..., color='red', linestyle='--', alpha=0.5, label='...')
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)

    # Right panel
    ax2 = axes[1]
    # ... complementary visualization ...

    plt.tight_layout()
    output_path = OUTPUT_DIR / "<study>.png"
    save_figure(fig, output_path)

    # 6. Print conclusion with hypothesis evaluation
    print(f"\nConclusion:")
    print("-" * 60)
    if <hypothesis_supported>:
        print(f"  ✓ Hypothesis supported: ...")
    else:
        print(f"  ✗ Hypothesis rejected: ...")

    # Report any actionable findings
    if <actionable>:
        print(f"  ⚠ Actionable: ...")

    print(f"\n✓ <Study> analysis complete")

if __name__ == "__main__":
    main()
```

### Required Statistical Methods

All studies MUST use these methods from `analysis/util.py`:

| Method | When to Use |
|--------|-------------|
| `wilson_score_interval(successes, total, confidence=0.95)` | Any proportion CI |
| `format_ci(lower, upper, as_percent=True)` | Formatting CIs |
| `save_figure(fig, path, tight=True)` | Saving all figures |
| `chi_squared_test(s1, n1, s2, n2)` | Comparing two proportions |
| `cohens_h(p1, p2)` | Effect size for proportions |
| `odds_ratio(s1, n1, s2, n2)` | Odds ratio with CI |

### Visualization Standards

All figures MUST follow these standards (already set in `util.py`):

```python
# In util.py - already configured:
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
```

Additional requirements:

1. **Figure Size**: `(14, 6)` for two-panel, `(10, 6)` for single panel
2. **Error Bars**: 95% Wilson score intervals for all proportions
3. **Reference Lines**: Red dashed lines for targets/thresholds
4. **Grid**: `ax.grid(True, axis='y', alpha=0.3)`
5. **Legends**: Always include, position appropriately
6. **Axis Labels**: Descriptive, include units if applicable
7. **Titles**: State what the panel shows, not the hypothesis

### CSV Schema Requirements

All CSV files MUST include these columns:

```
trial_id        - Integer, unique per trial (0-indexed)
seed            - Integer, deterministic seed used (getSeed(trialId))
elapsed_micros  - Integer, execution time in microseconds
```

Plus study-specific columns. Column names MUST be:
- snake_case
- Descriptive
- Consistent with result interface

### Sample Size Guidance

Use `getSampleSize(full, quick)` with these defaults:

| Study Type | Full | Quick | Rationale |
|------------|------|-------|-----------|
| Detection rate comparison | 500 | 100 | ~4% margin at 95% CI |
| Distribution validation | 10000 | 1000 | Stable chi-squared |
| Timing measurement | 100 | 20 | Time variability dominates |

---

## Individual Study Designs

### Study 1: Biased Sampling Impact

**Hypothesis**: BiasedSampler detects boundary bugs 2-3x faster than RandomSampler.

**TypeScript Study** (`biased-sampling.study.ts`):

```typescript
interface BiasedSamplingResult {
  trialId: number
  seed: number
  samplerType: 'biased' | 'random'
  bugType: 'boundary_min' | 'boundary_max' | 'middle' | 'random'
  bugDetected: boolean
  testsToDetection: number | null  // null if not detected
  testsRun: number
  elapsedMicros: number
}

// Configuration
const bugTypes = [
  { name: 'boundary_min', predicate: (x: number) => x !== 0 },          // Fails at min
  { name: 'boundary_max', predicate: (x: number) => x !== 100 },        // Fails at max
  { name: 'middle', predicate: (x: number) => x < 45 || x > 55 },       // Fails in middle
  { name: 'random', predicate: (x: number) => x !== 42 }                // Fails at arbitrary value
]

const samplerTypes = ['biased', 'random']
const trialsPerConfig = getSampleSize(500, 100)
```

**Python Analysis** (`analysis/biased-sampling.py`):

```python
# Compute detection rates per bug type × sampler
# Wilson score CI for each proportion
# Chi-squared test: biased vs random for each bug type
# Cohen's h effect size

# Figure 1: Grouped bar chart - detection rate by bug type
# - X-axis: bug type (boundary_min, boundary_max, middle, random)
# - Y-axis: detection rate (0-1)
# - Bars: biased (green) vs random (blue)
# - Error bars: 95% Wilson CI

# Figure 2: Box plot - tests to detection
# - X-axis: bug type × sampler
# - Y-axis: tests to detection (only for detected)
# - Show median, IQR, outliers
```

---

### Study 2: Deduplication Efficiency

**Hypothesis**: Deduplication improves unique value coverage with measurable overhead.

**TypeScript Study** (`deduplication.study.ts`):

```typescript
interface DeduplicationResult {
  trialId: number
  seed: number
  arbitraryType: 'exact' | 'non_injective' | 'filtered'
  samplerType: 'deduping' | 'random'
  requestedCount: number
  actualCount: number
  uniqueCount: number
  terminationGuardTriggered: boolean
  elapsedMicros: number
}

// Configuration
const arbitraryTypes = [
  { name: 'exact', arb: fc.integer(0, 99) },                    // 100 distinct values
  { name: 'non_injective', arb: fc.integer(0, 99).map(x => x % 10) },  // 10 distinct after map
  { name: 'filtered', arb: fc.integer(0, 99).filter(x => x % 10 === 0) } // 10 distinct after filter
]

const requestedCounts = [10, 50, 100, 500]
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/deduplication.py`):

```python
# Compute unique/requested ratio per configuration
# Track termination guard trigger rate
# Measure time overhead (deduping / random)

# Figure 1: Line plot - unique samples vs requested
# - X-axis: requested count
# - Y-axis: unique count achieved
# - Lines: one per arbitrary type
# - Shading: 95% CI

# Figure 2: Stacked bar - termination guard analysis
# - X-axis: arbitrary type
# - Y-axis: proportion of trials
# - Stacks: completed vs maxAttempts vs maxNoProgress
```

---

### Study 3: Weighted Union Probability

**Hypothesis**: ArbitraryComposite samples each branch proportionally to its size.

**TypeScript Study** (`weighted-union.study.ts`):

```typescript
interface WeightedUnionResult {
  trialId: number
  seed: number
  unionType: 'exact_exact' | 'exact_estimated' | 'estimated_estimated'
  branchSizes: string  // JSON array [size1, size2]
  sampledBranch: 0 | 1
  expectedProbability: number
  elapsedMicros: number
}

// Configuration - track which branch was sampled in each pick
const unionTypes = [
  {
    name: 'exact_exact',
    arb: fc.union(fc.integer(0, 10), fc.boolean()),  // sizes 11, 2
    expectedP0: 11/13
  },
  {
    name: 'exact_estimated',
    arb: fc.union(fc.integer(0, 99), fc.integer(0, 99).filter(x => x % 10 === 0)),
    // sizes 100, ~10 (estimated)
  }
]

// Sample 10000 times per union, 100 trials
const samplesPerTrial = 10000
const trialsPerConfig = getSampleSize(100, 20)
```

**Python Analysis** (`analysis/weighted-union.py`):

```python
# Compute empirical branch frequency per union type
# Chi-squared goodness-of-fit: observed vs expected proportions
# Report χ², df, p-value

# Figure 1: Bar chart with expected overlay
# - X-axis: union type
# - Y-axis: proportion selecting branch 0
# - Blue bars: observed
# - Red markers: expected
# - Error bars: 95% CI

# Figure 2: Residual plot (observed - expected)
# - Show deviation from theoretical expectation
```

---

### Study 4: Filter Cascade Impact

**Hypothesis**: Size estimation accuracy degrades with filter depth.

**TypeScript Study** (`filter-cascade.study.ts`):

```typescript
interface FilterCascadeResult {
  trialId: number
  seed: number
  chainDepth: number
  filterPassRate: number  // per filter
  compositePassRate: number  // product
  estimatedSize: number
  actualDistinctValues: number
  credibleIntervalLower: number
  credibleIntervalUpper: number
  trueValueInCI: boolean
  elapsedMicros: number
}

// Configuration
const chainDepths = [1, 2, 3, 5]
const filterPassRates = [0.5, 0.7, 0.9]
const baseSize = 1000
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/filter-cascade.py`):

```python
# Compute estimation error: (estimated - actual) / actual
# Track credible interval coverage rate
# Test for error accumulation trend

# Figure 1: Line plot - estimation error vs chain depth
# - X-axis: chain depth
# - Y-axis: relative error
# - Lines: one per filter pass rate
# - Error bars: 95% CI

# Figure 2: Bar chart - CI coverage
# - X-axis: chain depth
# - Y-axis: proportion of trials where true value in CI
# - Target line at 95%
```

---

### Study 5: Mapped Arbitrary Size

**Hypothesis**: Non-bijective maps cause size overestimation proportional to collision rate.

**TypeScript Study** (`mapped-size.study.ts`):

```typescript
interface MappedSizeResult {
  trialId: number
  seed: number
  mapType: 'bijective' | 'surjective_10to1' | 'surjective_5to1'
  baseSize: number
  reportedSize: number
  actualDistinctValues: number
  sizeRatio: number  // reported / actual
  elapsedMicros: number
}

// Configuration
const mapTypes = [
  { name: 'bijective', map: (x: number) => x * 2 },
  { name: 'surjective_10to1', map: (x: number) => x % 10 },
  { name: 'surjective_5to1', map: (x: number) => x % 20 }
]
const baseArbitrary = fc.integer(0, 99)  // 100 values
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/mapped-size.py`):

```python
# Compute size ratio per map type
# Test if ratio matches expected collision rate

# Figure 1: Bar chart - size ratio by map type
# - X-axis: map type
# - Y-axis: reported size / actual distinct
# - Error bars: 95% CI
# - Reference line at 1.0 (perfect estimation)

# Figure 2: Impact on union weighting
# - Show how overestimation skews branch selection probability
```

---

### Study 6: Chained Arbitrary Distribution

**Hypothesis**: flatMap creates predictable non-uniform distributions.

**TypeScript Study** (`chained-distribution.study.ts`):

```typescript
interface ChainedDistributionResult {
  trialId: number
  seed: number
  baseValue: number
  resultValue: number
  elapsedMicros: number
}

// Configuration
// Chain: integer(1, 10).flatMap(n => integer(1, n))
// Theoretical P(k) = (11 - k) / 55 for k in 1..10
const samplesPerTrial = 50000
const trialsPerConfig = getSampleSize(100, 20)
```

**Python Analysis** (`analysis/chained-distribution.py`):

```python
# Compute empirical distribution of result values
# Compare to theoretical distribution
# Chi-squared goodness-of-fit

# Figure 1: Histogram with theoretical overlay
# - X-axis: result value (1-10)
# - Y-axis: frequency
# - Blue bars: observed
# - Red line: theoretical

# Figure 2: Heatmap of (base, result) pairs
# - X-axis: base value (1-10)
# - Y-axis: result value (1-10)
# - Color: frequency
# - Show only valid cells (result <= base)
```

---

### Study 7: Corner Case Coverage

**Hypothesis**: >50% of boundary bugs are found via corner cases alone.

**TypeScript Study** (`corner-case-coverage.study.ts`):

```typescript
interface CornerCaseCoverageResult {
  trialId: number
  seed: number
  bugType: 'null' | 'empty_boundary' | 'off_by_one' | 'interior'
  samplingMode: 'corner_only' | 'random_only' | 'hybrid'
  bugDetected: boolean
  detectedByCornerCase: boolean | null  // null if not detected
  testsRun: number
  elapsedMicros: number
}

// Configuration
const bugTypes = [
  { name: 'null', predicate: (x: number) => x !== 0 },
  { name: 'empty_boundary', predicate: (x: number) => x !== 0 && x !== 100 },
  { name: 'off_by_one', predicate: (x: number) => x !== 1 && x !== 99 },
  { name: 'interior', predicate: (x: number) => x !== 50 }
]

const samplingModes = ['corner_only', 'random_only', 'hybrid']
const trialsPerConfig = getSampleSize(500, 100)
```

**Python Analysis** (`analysis/corner-case-coverage.py`):

```python
# Compute detection rate per bug type × sampling mode
# Attribution: what % of detections came from corner cases in hybrid mode

# Figure 1: Grouped bar chart - detection rate by bug type
# - Bars: corner_only, random_only, hybrid
# - Error bars: 95% Wilson CI

# Figure 2: Pie chart - attribution in hybrid mode
# - For detected bugs: corner case vs random sample
```

---

### Study 8: Shrinking Fairness

**Hypothesis**: Earlier quantifiers shrink more aggressively.

**TypeScript Study** (`shrinking-fairness.study.ts`):

```typescript
interface ShrinkingFairnessResult {
  trialId: number
  seed: number
  quantifierOrder: string  // 'abc' | 'bac' | 'cab'
  initialA: number
  initialB: number
  initialC: number
  finalA: number
  finalB: number
  finalC: number
  shrinkRoundsA: number
  shrinkRoundsB: number
  shrinkRoundsC: number
  elapsedMicros: number
}

// Configuration
// Property: forall(a, b, c: int(0,100)).then(a + b + c <= 150)
// Symmetric, so shrinking should be similar across positions
const quantifierOrders = ['abc', 'bac', 'cab']
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/shrinking-fairness.py`):

```python
# Compute final value distribution per position (first, second, third)
# Compare shrink effort (rounds) per position
# Test for position effect with ANOVA

# Figure 1: Box plot - final value by position
# - X-axis: position (first, second, third)
# - Y-axis: final value

# Figure 2: Bar chart - shrink rounds by position
# - Error bars: 95% CI
```

---

### Study 9: Caching Trade-off

**Hypothesis**: Caching reduces diversity but with minimal detection loss.

**TypeScript Study** (`caching-tradeoff.study.ts`):

```typescript
interface CachingTradeoffResult {
  trialId: number
  seed: number
  cacheEnabled: boolean
  bugType: 'any_value' | 'diversity_dependent'
  bugDetected: boolean
  uniqueValuesSeen: number
  iterationsRun: number
  elapsedMicros: number
}

// Configuration
// Run same scenario 10 times; caching reuses samples across iterations
const iterations = 10
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/caching-tradeoff.py`):

```python
# Compare detection rate: cached vs fresh
# Compare unique values across iterations
# Compute time savings

# Figure 1: Bar chart - detection rate
# - cached vs fresh, by bug type

# Figure 2: Line plot - unique values over iterations
# - cached (flat after first) vs fresh (accumulating)
```

---

### Study 10: Sample Budget Distribution

**Hypothesis**: Nested quantifiers reduce per-quantifier samples, hurting detection in deep positions.

**TypeScript Study** (`sample-budget.study.ts`):

```typescript
interface SampleBudgetResult {
  trialId: number
  seed: number
  quantifierDepth: number  // 1, 2, 3, 4
  bugPosition: 'first' | 'middle' | 'last' | 'cross'
  maxTests: number
  actualTestsRun: number
  bugDetected: boolean
  samplesPerQuantifier: string  // JSON array
  elapsedMicros: number
}

// Configuration
// Formula: perQuantifier = maxTests^(1/depth)
// 1000 tests: depth 1→1000, depth 2→31, depth 3→10, depth 4→5
const depths = [1, 2, 3, 4]
const maxTests = 1000
const trialsPerConfig = getSampleSize(500, 100)
```

**Python Analysis** (`analysis/sample-budget.py`):

```python
# Compute detection rate by depth × bug position
# Test for interaction effect

# Figure 1: Heatmap - detection rate by depth × position
# - X-axis: quantifier depth
# - Y-axis: bug position

# Figure 2: Line plot - detection rate by depth
# - Lines: one per bug position
```

---

### Study 11: Streaming Statistics Accuracy

**Hypothesis**: Streaming quantiles are within 5% of exact for n > 100.

**TypeScript Study** (`streaming-accuracy.study.ts`):

```typescript
interface StreamingAccuracyResult {
  trialId: number
  seed: number
  distribution: 'uniform' | 'normal' | 'exponential' | 'bimodal'
  sampleSize: number
  streamingMean: number
  exactMean: number
  streamingMedian: number
  exactMedian: number
  streamingQ1: number
  exactQ1: number
  streamingQ3: number
  exactQ3: number
  elapsedMicros: number
}

// Configuration
const distributions = ['uniform', 'normal', 'exponential', 'bimodal']
const sampleSizes = [10, 100, 1000, 10000]
const trialsPerConfig = getSampleSize(200, 50)
```

**Python Analysis** (`analysis/streaming-accuracy.py`):

```python
# Compute relative error for each statistic
# Test if error < 5% for n > 100

# Figure 1: Line plot - relative error vs sample size
# - Lines: mean, median, Q1, Q3
# - Reference line at 5%

# Figure 2: Box plot - error distribution by sample size
```

---

### Study 12: Length Distribution

**Hypothesis**: Length-boundary bugs are found faster with edge-biased distribution.

**TypeScript Study** (`length-distribution.study.ts`):

```typescript
interface LengthDistributionResult {
  trialId: number
  seed: number
  lengthDistribution: 'uniform' | 'geometric' | 'edge_biased'
  bugType: 'empty' | 'single' | 'max_boundary' | 'interior'
  bugDetected: boolean
  testsToDetection: number | null
  testsRun: number
  elapsedMicros: number
}

// Configuration
// Array with minLength=0, maxLength=10
const lengthDistributions = ['uniform', 'geometric', 'edge_biased']
const bugTypes = [
  { name: 'empty', predicate: (arr: number[]) => arr.length !== 0 },
  { name: 'single', predicate: (arr: number[]) => arr.length !== 1 },
  { name: 'max_boundary', predicate: (arr: number[]) => arr.length !== 10 },
  { name: 'interior', predicate: (arr: number[]) => arr.length !== 5 }
]
const trialsPerConfig = getSampleSize(500, 100)
```

**Python Analysis** (`analysis/length-distribution.py`):

```python
# Compute detection rate by distribution × bug type
# Chi-squared test for each bug type

# Figure 1: Grouped bar chart - detection rate
# - X-axis: bug type
# - Bars: uniform, geometric, edge_biased

# Figure 2: Violin plot - tests to detection
```

---

## Decisions

### Decision: Use Existing Runner Utilities

All studies MUST use `runner.ts` utilities:
- `getSeed(trialId)` - deterministic seed generation
- `getSampleSize(full, quick)` - mode-aware sample sizes
- `mulberry32(seed)` - deterministic PRNG
- `CSVWriter` - consistent CSV output
- `ProgressReporter` - user feedback
- `HighResTimer` - microsecond timing

**Rationale**: Ensures reproducibility and consistency with existing studies.

### Decision: Use Existing Analysis Utilities

All analysis scripts MUST use `util.py` utilities:
- `wilson_score_interval()` - proportion CIs
- `chi_squared_test()` - proportion comparison
- `save_figure()` - consistent figure output
- `format_ci()` - CI formatting

**Rationale**: Maintains statistical rigor and visual consistency.

### Decision: Analysis Directory Location

Python analysis files go in `analysis/` (not `scripts/evidence/analysis/`).

**Rationale**: Matches existing structure.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Studies take too long | Use `getSampleSize()` for quick mode |
| Results contradict assumptions | Document findings; create follow-up proposals |
| Python dependency in CI | Keep evidence generation manual |
| Existing runner.ts missing features | Add to runner.ts as shared utilities |

---

## Migration Plan

1. Implement P1 studies first (biased sampling, weighted union, corner cases)
2. Run in quick mode to validate approach
3. Review results and refine methodology
4. Proceed to P2 studies
5. Archive change after all studies complete

---

## Open Questions

1. ~~Should studies live in `scripts/evidence/` or separate `experiments/` directory?~~ → `scripts/evidence/`
2. ~~Should analysis scripts go in `analysis/` or `scripts/evidence/analysis/`?~~ → `analysis/`
3. ~~Should we add a `npm run evidence:apparatus:all` that runs all new studies?~~ → Yes
4. ~~How should we handle studies that reveal bugs in current implementation?~~ -> Document and create new GH Issues
