# Change: Fix CI Calibration Advanced Studies

> **Related Document:** `docs/evidence/ci-calibration-advanced.md`
> **Related Implementation:** `scripts/evidence/ci-calibration.study.ts`

## Why

The document `docs/evidence/ci-calibration-advanced.md` proposes 7 additional studies to validate credible interval (CI) behavior in realistic PBT scenarios. While the basic CI calibration study successfully validates ~92% coverage under controlled conditions, the advanced studies document contains **22 critical issues** across methodology, assumptions, evidence, clarity, and unexplored ideas that must be addressed before implementation:

**Critical Methodology Gaps (7 issues)**:
- Study B misinterprets the early termination logic (mathematical category confusion)
- Study A has sequential testing bias (multiple comparisons problem)
- Study C has intractable ground truth computation and non-deterministic filters
- Study D conflates calibration and precision without defining degradation mechanism
- Study E underspecifies shrinking model and cold-start handling
- Study F references non-existent ChainedArbitrary implementation
- Beta(2,1) prior is unjustified and contradicts code comments

**Unexplained Assumptions (4 issues)**:
- Warmup sample sizes (10 vs 200) are arbitrary with no justification
- Interval arithmetic conservatism is empirically observed but not mathematically proven
- No analysis of correlation effects in composed filters
- No definition of "excessive conservatism" (99% threshold arbitrary)

**Insufficient Evidence (5 issues)**:
- Filter chain depth-2 vs depth-3 coverage anomaly (86.6% vs 95.6%) unexplained
- Study G's 10% threshold ignores sampling variance (fails chi-squared requirements)
- No statistical power analysis for any proposed study
- No outlier detection or reporting of extreme miscalibrations
- No baseline comparisons to show improvement over naive approaches

**Lack of Clarity (3 issues)**:
- "Coverage" vs "width" terminology conflated throughout
- "Early termination correctness" mixes frequentist and Bayesian concepts
- "Convergence" not formally defined (no metric, rate, or error bounds)

**Unexplored Ideas (3 issues)**:
- Adaptive warmup based on CI width variance
- Warm start for shrunk arbitraries (transfer parent posterior)
- Non-uniform base distributions and correlated filters

These gaps would lead to:
1. **Invalid studies**: Non-deterministic filters, untestable hypotheses, intractable computations
2. **Misleading results**: Sequential testing bias, sampling variance ignored, wrong statistical tests
3. **Missed insights**: No power analysis, no outlier detection, no baseline comparisons
4. **Implementation confusion**: Contradictory documentation, undefined terms, missing code references

## What Changes

### Phase 1: Critical Fixes to Existing Documentation

**1.1 Fix ci-calibration-advanced.md Methodology**
- Study B: Correct mathematical interpretation of early termination logic
- Study A: Replace checkpoint approach with independent trials per sample size
- Study C: Replace intractable/non-deterministic filters with computable patterns
- Study D: Separate calibration vs precision hypotheses, define degradation model
- Study E: Specify shrinking scenarios with known true sizes, document cold-start
- Study F: Verify flatMap/ChainedArbitrary implementation exists or mark as future work

**1.2 Document and Justify Assumptions**
- Add Study A substudy: Test calibration at various warmup counts (10, 25, 50, 100, 200)
- Add mathematical proof or citation for interval arithmetic conservatism
- Replace arbitrary thresholds (99%, 10%) with statistically justified criteria
- Document Beta(2,1) prior rationale or switch to Beta(1,1)

**1.3 Add Statistical Rigor**
- Add power analysis section to each study (sample size justification)
- Replace Study G's 10% threshold with chi-squared goodness-of-fit test
- Add outlier detection: report 95th percentile errors, >2σ deviations
- Add convergence rate analysis to Study A with formal metric

**1.4 Clarify Terminology**
- Create glossary: "coverage" (proportion with true∈CI), "precision" (CI width), "efficiency" (narrow + correct)
- Rewrite Study B with consistent Bayesian language
- Add operational definitions for all informal terms ("convergence", "degradation", "conservative")

### Phase 2: New Studies for Unexplored Ideas

**2.1 Study H: Adaptive Warmup**
- Compare fixed warmup vs adaptive stopping (CI width < threshold or stabilized)
- Measure: samples used, coverage maintained, early termination accuracy
- Hypothesis: Adaptive warmup reduces samples by 30% while maintaining 90% coverage

**2.2 Study I: Warm Start Shrinking**
- Test transferring parent posterior to shrunk FilteredArbitrary
- Compare: cold start (current) vs warm start (transferred posterior)
- Hypothesis: Warm start maintains calibration with 50% fewer samples

**2.3 Study J: Non-Uniform Base Distributions**
- Test CI calibration on frequency-weighted, exponential, geometric bases
- Hypothesis: Coverage ≥90% regardless of base distribution shape

**2.4 Study K: Correlation in Composition**
- Test interval arithmetic under positive/negative filter correlation
- Hypothesis: Conservatism preserved under correlation (coverage ≥95%)

### Phase 3: Enhanced Basic Study Analysis

**3.1 Investigate Depth-2 vs Depth-3 Anomaly**
- Re-run filter chain study with 10,000 trials (vs 1,000)
- Plot coverage vs depth for depths 1-10
- Add 95% confidence intervals on all coverage estimates
- Inspect depth-2 scenario code for bugs

**3.2 Add Baseline Comparisons**
- Naive: point estimate only (expected coverage ~0%)
- Pessimistic: [0, baseSize] always (expected coverage 100%)
- Frequentist: normal approximation CI
- Oracle: true Bayesian propagation via Monte Carlo

**3.3 Add Comprehensive Reporting**
- Coverage with 95% CI (not just point estimate)
- Min/max/median/95th percentile CI width
- Proportion of trials with true value >2σ outside CI
- Relative efficiency vs oracle (width ratio)

## Impact

**Affected Documentation**:
- Modified: `docs/evidence/ci-calibration-advanced.md` (all 7 studies revised)
- New: `docs/evidence/ci-calibration-adaptive.md` (Studies H, I, J, K)
- Modified: `docs/evidence/ci-calibration.md` (add anomaly investigation, baselines, enhanced reporting)

**Affected Code**:
- Modified: `scripts/evidence/ci-calibration.study.ts` (add baselines, enhanced metrics, anomaly investigation)
- New: `scripts/evidence/ci-calibration-adaptive.study.ts` (Studies H, I)
- New: `scripts/evidence/ci-calibration-nonuniform.study.ts` (Study J)
- New: `scripts/evidence/ci-calibration-correlation.study.ts` (Study K)
- Modified: `src/arbitraries/FilteredArbitrary.ts` (document Beta(2,1) prior, add warm-start option for Study I)

**Affected Analysis**:
- Modified: `analysis/ci_calibration.py` (add power analysis, outlier detection, baseline plots)
- New: `analysis/ci_calibration_adaptive.py`
- New: `analysis/ci_calibration_nonuniform.py`
- New: `analysis/ci_calibration_correlation.py`

**Breaking Changes**: None (evidence is documentation, not API)

**Dependencies**:
- Existing Python toolchain (matplotlib, seaborn, scipy, pandas)
- Existing TypeScript evidence infrastructure (runner.ts, CSVWriter, etc.)

## Success Criteria

### Phase 1 (Critical Fixes)
1. All 7 studies in ci-calibration-advanced.md have:
   - Deterministic, reproducible test scenarios
   - Computable ground truth
   - Power analysis with justified sample sizes
   - Proper statistical tests (chi-squared, not arbitrary thresholds)
   - Clear hypotheses with operational definitions
2. Zero TODO comments regarding mathematical assumptions
3. Glossary with precise definitions for all technical terms
4. All code references verified or marked as future work

### Phase 2 (New Studies)
1. Studies H, I, J, K implemented following existing patterns
2. Each study produces publication-quality figures with error bars
3. Raw CSV data version-controlled and reproducible
4. At least one study identifies actionable improvement

### Phase 3 (Enhanced Analysis)
1. Depth-2 vs depth-3 anomaly explained or confirmed significant with p-value
2. All coverage estimates include 95% confidence intervals
3. Baseline comparisons show current approach meaningfully better than naive
4. Oracle comparison quantifies gap to optimal (e.g., "intervals 1.5x wider than optimal")

### Overall
1. Zero mathematical errors or category confusions
2. Zero non-deterministic test scenarios
3. All sample sizes justified by power analysis (80% power minimum)
4. All figures have axis labels, legends, error bars, and clear captions
5. Documentation enables external audit and replication
6. Studies inform at least 2 concrete improvements to fluent-check

## Prioritization

**P0 (Critical - Blocks Implementation)**:
- Fix Study B mathematical interpretation
- Fix Study C deterministic filters
- Add power analysis to all studies
- Verify Study F implementation exists

**P1 (High - Required for Validity)**:
- Fix Study A sequential testing bias
- Fix Study D calibration vs precision separation
- Fix Study E shrinking scenarios
- Document Beta(2,1) prior rationale
- Investigate depth-2 vs depth-3 anomaly
- Add statistical rigor to Study G

**P2 (Medium - Improves Quality)**:
- Add Studies H (adaptive warmup) and I (warm start)
- Add baseline comparisons
- Add comprehensive reporting metrics
- Clarify all terminology

**P3 (Low - Nice to Have)**:
- Add Studies J (non-uniform) and K (correlation)
- Add convergence rate analysis
- Add outlier reporting

## Risks and Mitigations

**Risk**: Fixing Study A (independent trials) increases computational cost 10x
- **Mitigation**: Use quick mode (n=100) for development, full mode (n=500) for publication

**Risk**: Study I (warm start) requires modifying FilteredArbitrary constructor
- **Mitigation**: Implement as optional feature flag, validate in separate study first

**Risk**: Oracle baseline (Monte Carlo) is expensive to compute
- **Mitigation**: Compute oracle for subset of scenarios (e.g., only filters, not compositions)

**Risk**: Phase 1 fixes may invalidate existing ci-calibration.md results
- **Mitigation**: Preserve existing study, create ci-calibration-v2.md with enhanced version

## Open Questions

1. Should Beta(2,1) prior be replaced with Beta(1,1)? (Requires theoretical justification or empirical comparison)
2. Does ChainedArbitrary/flatMap exist in codebase? (Requires code search)
3. What is acceptable coverage degradation with depth? (Requires stakeholder input)
4. Should warm-start shrinking be default behavior? (Requires Study I results)
5. What is the target interval width vs oracle? (1.5x? 2.0x? Requires performance tradeoff analysis)
