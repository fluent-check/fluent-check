# Tasks: Fix CI Calibration Advanced Studies

## Phase 1: Critical Fixes to Documentation (P0 - Blocking)

### 1.1 Fix Study B (Early Termination)
- [ ] 1.1.1 Correct mathematical interpretation of `sizeEstimation.inv(upperCredibleInterval)`
  - Document that this returns **rate** (percentile of Beta), not size
  - Clarify one-sided (95th percentile) vs two-sided (90% CI) distinction
- [ ] 1.1.2 Rewrite hypotheses with correct statistical interpretation
  - B1: False positive rate ≤ 5% (95th percentile by definition)
  - B2: False negative rate ≤ 50% (acceptable for rare filters)
  - B3: No spurious termination for size ≥ 10
- [ ] 1.1.3 Add edge case: early termination when base size is estimated
  - Hypothesis B4: Conservatism preserved for composed filters
- [ ] 1.1.4 Add scenario for very rare filters (0.1% pass rate)
- [ ] 1.1.5 Add statistical power analysis and sample size justification
- [ ] 1.1.6 Specify exact ground truth computation for each scenario

### 1.2 Fix Study A (Convergence Dynamics)
- [ ] 1.2.1 Replace checkpoint design with independent trials per warmup count
  - Create separate trials for w ∈ {10, 25, 50, 100, 200, 500}
  - Total: 6 scenarios × 500 trials = 3000 independent trials
- [ ] 1.2.2 Add explicit O(1/√n) convergence hypothesis with R² test
  - H: CI width ~ a/√w + b
  - H: MAE ~ c/√w + d
- [ ] 1.2.3 Add power analysis and sample size justification
- [ ] 1.2.4 Add acceptance criteria with statistical thresholds
  - A1: Coverage ≥ 85% for w ≥ 50
  - A2: R² ≥ 0.90 for width fit
  - A3: R² ≥ 0.80 for MAE fit
- [ ] 1.2.5 Specify exact scenarios (pass rates: 10%, 30%, 50%, 70%, 90%)

### 1.3 Fix Study C (Adversarial Patterns)
- [ ] 1.3.1 Replace `isPrime(x)` with computable alternatives
  - Modular pattern: `x % 2 === 0`
  - Bit-pattern: `popcount(x) % 2 === 0`
  - Hash-based: `((x * 2654435761) >>> 0) % 100 < 30`
- [ ] 1.3.2 Remove non-deterministic `Math.random()` filter entirely
- [ ] 1.3.3 Add clustered acceptance scenario: `x < threshold`
- [ ] 1.3.4 Add magnitude-dependent scenario: `x < 100 || (x >= 500 && x < 550)`
- [ ] 1.3.5 Specify exact ground truth for each scenario (analytical or exhaustive)
- [ ] 1.3.6 Add baseline comparison to uniform random filter

### 1.4 Fix Study D (Composition Depth)
- [ ] 1.4.1 Separate calibration hypotheses from precision hypotheses
  - D1: Coverage ≥ 90% (calibration)
  - D2: Coverage ≤ 99% (not excessive)
  - D3: Width growth ≤ 2× per level (precision)
  - D4: Width ≤ 2× oracle (efficiency)
- [ ] 1.4.2 Add mathematical rationale for interval arithmetic conservatism
- [ ] 1.4.3 Define "degradation" quantitatively (width growth rate)
- [ ] 1.4.4 Add oracle baseline computation (Monte Carlo from Beta posteriors)
- [ ] 1.4.5 Add acceptance criteria with numerical thresholds
- [ ] 1.4.6 Add power analysis

### 1.5 Fix Study E (Shrinking)
- [ ] 1.5.1 Specify exact shrink scenarios with known true sizes
  - Scenario 1: Shrunk space subset of passing (pass rate increases)
  - Scenario 2: Shrunk space same pattern (pass rate constant)
- [ ] 1.5.2 Document ground truth computation (exhaustive for small spaces, ≤1000)
- [ ] 1.5.3 Add warmup sensitivity analysis (0, 10, 50, 100 additional samples)
- [ ] 1.5.4 Document cold-start issue explicitly
- [ ] 1.5.5 Add reference to Study I (warm-start alternative)
- [ ] 1.5.6 Add acceptance criteria and power analysis

### 1.6 Verify Study F (flatMap/ChainedArbitrary)
- [ ] 1.6.1 Search codebase for flatMap implementation
  - `grep -r "flatMap" src/`
  - `grep -r "ChainedArbitrary" src/`
- [ ] 1.6.2 If exists: document size propagation mechanism
- [ ] 1.6.3 If exists: proceed with study as designed
- [ ] 1.6.4 If missing: mark study as "FUTURE WORK" and create GitHub issue
- [ ] 1.6.5 Update ci-calibration-advanced.md with implementation status

### 1.7 Document Beta Prior Rationale
- [ ] 1.7.1 Fix code comment in FilteredArbitrary.ts (line 11) to match implementation
  - Current: "use 1,1" (comment) vs `new BetaDistribution(2, 1)` (code)
- [ ] 1.7.2 Add Study A.4: Beta Prior Comparison
  - Test priors: Beta(0.5,0.5), Beta(1,1), Beta(2,1), Beta(2,2)
  - Compare coverage, MAE, CI width
- [ ] 1.7.3 Document rationale for current choice OR propose change
  - Option 1: Keep (2,1) with justification (optimistic bias acceptable)
  - Option 2: Switch to (1,1) using mean instead of mode
  - Option 3: Switch to (0.5,0.5) Jeffreys prior
- [ ] 1.7.4 Add code comment referencing study results

### 1.8 Add Power Analysis to All Studies
- [ ] 1.8.1 Create power analysis template for proportion tests
- [ ] 1.8.2 Add to Study B (early termination correctness)
- [ ] 1.8.3 Add to Study C (adversarial patterns)
- [ ] 1.8.4 Add to Study D (composition depth)
- [ ] 1.8.5 Add to Study E (shrinking)
- [ ] 1.8.6 Add to Study G (weighted union) - special case for chi-squared
- [ ] 1.8.7 Document sample size justifications in each study

### 1.9 Create Glossary
- [ ] 1.9.1 Define all technical terms precisely
  - Coverage (calibration)
  - Precision (CI width)
  - Conservatism (coverage > target)
  - Efficiency (coverage / (1 + relative_width))
  - Interval arithmetic
  - Oracle (optimal Bayesian method)
  - Warmup
- [ ] 1.9.2 Add glossary section to ci-calibration.md
- [ ] 1.9.3 Add glossary section to ci-calibration-advanced.md
- [ ] 1.9.4 Use consistent terminology throughout all documentation

---

## Phase 2: Enhanced Analysis (P1 - High Priority)

### 2.1 Investigate Depth-2 vs Depth-3 Anomaly
- [ ] 2.1.1 Re-run filter chain study with n=10,000 (vs current n=1,000)
- [ ] 2.1.2 Add intermediate depths: test depths 1, 2, 3, 4, 5
- [ ] 2.1.3 Vary warmup: test {100, 200, 300, 500, 1000} for each depth
- [ ] 2.1.4 Vary pass rate: test per-layer rates {50%, 70%, 90%}
- [ ] 2.1.5 Add debug metrics (alpha, beta, posterior mean/mode/variance)
- [ ] 2.1.6 Determine root cause:
  - H1: Statistical noise (resolved by n=10,000)
  - H2: Code bug (manual review)
  - H3: Pass rate interaction (systematic variation)
  - H4: Warmup insufficient (depth-2 needs more)
- [ ] 2.1.7 Document root cause and resolution in ci-calibration.md
- [ ] 2.1.8 Update ci-calibration-advanced.md if changes needed

### 2.2 Add Outlier Detection
- [ ] 2.2.1 Create `detect_outliers()` function in analysis/util.py
  - Detect true value >2σ outside CI
  - Detect CI width >5× median
  - Detect point estimate error >3× median
- [ ] 2.2.2 Add outlier detection to analysis/ci_calibration.py
- [ ] 2.2.3 Save outliers to docs/evidence/raw/outliers.csv
- [ ] 2.2.4 Investigate and document significant outliers (>1% of trials)
- [ ] 2.2.5 Add outlier analysis section to ci-calibration.md
- [ ] 2.2.6 Repeat for all advanced studies

### 2.3 Add Baseline Comparisons
- [ ] 2.3.1 Implement baseline methods in ci-calibration.study.ts
  - Naive: point estimate only, no interval
  - Pessimistic: [0, baseSize × 10]
  - Oracle: Monte Carlo from Beta posteriors
- [ ] 2.3.2 Add baseline scenarios to study (run all scenarios with each baseline)
- [ ] 2.3.3 Create `compare_baselines()` function in analysis
- [ ] 2.3.4 Plot baseline comparison (coverage, width, efficiency)
- [ ] 2.3.5 Document efficiency metric: coverage / (1 + relative_width)
- [ ] 2.3.6 Quantify gap between current and oracle
- [ ] 2.3.7 Add baseline comparison section to ci-calibration.md
- [ ] 2.3.8 Save baseline figure to docs/evidence/figures/ci-calibration-baselines.png

### 2.4 Add Warmup Recommendation Analysis
- [ ] 2.4.1 Create `recommend_warmup()` function in analysis
  - Find minimum w where coverage ≥ 90%, MAE < 20%, width < 50%
- [ ] 2.4.2 Compare to current values (constructor: 10, study: 200)
- [ ] 2.4.3 Document tradeoff (speed vs accuracy)
- [ ] 2.4.4 Make recommendation with rationale
- [ ] 2.4.5 Update FilteredArbitrary.ts if change recommended
- [ ] 2.4.6 Add warmup selection section to ci-calibration.md

### 2.5 Add Interval Arithmetic Mathematical Proof
- [ ] 2.5.1 Prove interval arithmetic preserves coverage for independent intervals
  - Product: P(X∈CI_X AND Y∈CI_Y) ≥ α² for α-credible intervals
- [ ] 2.5.2 Explain why observed coverage (~97%) exceeds lower bound (81%)
- [ ] 2.5.3 Add citations: Moore et al. (2009), Gelman et al. (2013)
- [ ] 2.5.4 Document correlation as open question (Study K will test)
- [ ] 2.5.5 Add mathematical foundations section to ci-calibration.md

### 2.6 Fix Arbitrary Thresholds
- [ ] 2.6.1 Replace H4 "coverage ≤ 99%" with precision-based hypotheses
  - H4a: Mean width ≤ 2× oracle
  - H4b: Median relative width < 30%
- [ ] 2.6.2 Replace Study G "within 10%" with chi-squared test
  - Add chi_squared_test() function
  - Add Cohen's h effect size
  - Justify sample size (n=10,000 for smallest category ≥5)
- [ ] 2.6.3 Update ci-calibration.md with revised H4
- [ ] 2.6.4 Update ci-calibration-advanced.md Study G

---

## Phase 3: New Studies (P2 - Medium Priority)

### 3.1 Study H: Adaptive Warmup
- [ ] 3.1.1 Create docs/evidence/ci-calibration-adaptive.md
- [ ] 3.1.2 Implement scripts/evidence/ci-adaptive-warmup.study.ts
  - Fixed warmup (current): 10, 50, 100, 200
  - Adaptive: stop when CI width < threshold OR stabilized
- [ ] 3.1.3 Measure: samples used, coverage, early termination accuracy
- [ ] 3.1.4 Hypothesis: Adaptive reduces samples by 30% while maintaining coverage
- [ ] 3.1.5 Create analysis/ci_adaptive_warmup.py
- [ ] 3.1.6 Run study and generate figures
- [ ] 3.1.7 Document results and recommendation

### 3.2 Study I: Warm Start Shrinking
- [ ] 3.2.1 Add to docs/evidence/ci-calibration-adaptive.md
- [ ] 3.2.2 Implement warm-start option in FilteredArbitrary
  - `shrink()` accepts optional `transferPosterior` flag
  - Transfers parent's alpha, beta (scaled by shrink ratio)
- [ ] 3.2.3 Implement scripts/evidence/ci-warm-start.study.ts
  - Compare: cold start (current) vs warm start
  - Measure: samples needed, coverage, CI width
- [ ] 3.2.4 Hypothesis: Warm start maintains coverage with 50% fewer samples
- [ ] 3.2.5 Create analysis/ci_warm_start.py
- [ ] 3.2.6 Run study and generate figures
- [ ] 3.2.7 Document results and decide if warm-start should be default

### 3.3 Study J: Non-Uniform Base Distributions (Optional)
- [ ] 3.3.1 Create docs/evidence/ci-calibration-nonuniform.md
- [ ] 3.3.2 Implement scripts/evidence/ci-nonuniform.study.ts
  - Test filters on: uniform, exponential, geometric, frequency-weighted bases
- [ ] 3.3.3 Hypothesis: Coverage ≥90% regardless of base distribution
- [ ] 3.3.4 Create analysis/ci_nonuniform.py
- [ ] 3.3.5 Run study and generate figures
- [ ] 3.3.6 Document limitations if any base distributions fail

### 3.4 Study K: Correlation in Composition (Optional)
- [ ] 3.4.1 Add to docs/evidence/ci-calibration-nonuniform.md
- [ ] 3.4.2 Implement scripts/evidence/ci-correlation.study.ts
  - Test: independent (baseline), positive correlation, negative correlation
  - Example: two filters on same base value with overlapping ranges
- [ ] 3.4.3 Hypothesis: Conservatism preserved (coverage ≥95%) under correlation
- [ ] 3.4.4 Create analysis/ci_correlation.py
- [ ] 3.4.5 Run study and generate figures
- [ ] 3.4.6 Document when correlation breaks interval arithmetic assumptions

---

## Phase 4: Enhanced Basic Study (P1)

### 4.1 Add Enhanced Reporting
- [ ] 4.1.1 Modify analysis/ci_calibration.py to include:
  - Coverage with 95% CI (Wilson score), not just point estimate
  - Min/max/median/95th percentile CI width
  - Proportion of trials with true >2σ outside CI
  - Relative efficiency vs oracle
- [ ] 4.1.2 Update figures to include error bars on all coverage estimates
- [ ] 4.1.3 Update ci-calibration.md tables with 95% CIs
- [ ] 4.1.4 Add percentile analysis for CI width

### 4.2 Re-run Basic Study with Enhancements
- [ ] 4.2.1 Add baseline scenarios (naive, pessimistic, oracle)
- [ ] 4.2.2 Add outlier detection
- [ ] 4.2.3 Add warmup recommendation analysis
- [ ] 4.2.4 Re-run with n=10,000 for filter chains (investigate anomaly)
- [ ] 4.2.5 Generate updated figures
- [ ] 4.2.6 Update docs/evidence/ci-calibration.md with all enhancements

---

## Phase 5: Code Changes (Conditional)

### 5.1 FilteredArbitrary Changes (if studies recommend)
- [ ] 5.1.1 Update Beta prior if Study A.4 recommends change
  - Document choice with reference to study
- [ ] 5.1.2 Update warmup count if Study A.5 recommends change
  - Document choice with reference to study
- [ ] 5.1.3 Add warm-start option if Study I shows benefit
  - Make optional (breaking change if default)
  - Add feature flag for enabling
- [ ] 5.1.4 Fix comment on line 11 to match implementation

### 5.2 Utility Functions
- [ ] 5.2.1 Add chi_squared_test() to analysis/util.py
- [ ] 5.2.2 Add cohens_h() effect size to analysis/util.py
- [ ] 5.2.3 Add detect_outliers() to analysis/util.py
- [ ] 5.2.4 Add recommend_warmup() to analysis/util.py
- [ ] 5.2.5 Add compare_baselines() to analysis/util.py

---

## Phase 6: Documentation Updates

### 6.1 Update ci-calibration-advanced.md
- [ ] 6.1.1 Apply all fixes from Phase 1 (Studies B, A, C, D, E, F)
- [ ] 6.1.2 Add glossary section
- [ ] 6.1.3 Add power analysis to all studies
- [ ] 6.1.4 Add acceptance criteria to all studies
- [ ] 6.1.5 Update priority ranking based on new findings
- [ ] 6.1.6 Add references to new Studies H, I, J, K

### 6.2 Update ci-calibration.md
- [ ] 6.2.1 Add glossary section
- [ ] 6.2.2 Add anomaly investigation section (depth-2 vs depth-3)
- [ ] 6.2.3 Add baseline comparison section
- [ ] 6.2.4 Add warmup recommendation section
- [ ] 6.2.5 Add mathematical foundations section
- [ ] 6.2.6 Add outlier analysis section
- [ ] 6.2.7 Update all tables with 95% CIs
- [ ] 6.2.8 Add power analysis section
- [ ] 6.2.9 Replace arbitrary thresholds with justified criteria

### 6.3 Create New Documentation
- [ ] 6.3.1 Create docs/evidence/ci-calibration-adaptive.md (Studies H, I)
- [ ] 6.3.2 Create docs/evidence/ci-calibration-nonuniform.md (Studies J, K)
- [ ] 6.3.3 Create docs/evidence/ci-calibration-methodology.md (glossary, power analysis, statistical foundations)

### 6.4 Update README
- [ ] 6.4.1 Add new studies to evidence index
- [ ] 6.4.2 Document key findings from all studies
- [ ] 6.4.3 Add actionable recommendations
- [ ] 6.4.4 Reference study results in codebase decisions

---

## Phase 7: Validation

### 7.1 Reproducibility Checks
- [ ] 7.1.1 Run all studies twice with same seed, verify identical results
- [ ] 7.1.2 Verify all CSVs are deterministic
- [ ] 7.1.3 Run on different machine, verify results match
- [ ] 7.1.4 Check git diff for docs/evidence/raw/*.csv (should be identical)

### 7.2 Statistical Validation
- [ ] 7.2.1 Verify all power analyses are correct (manual calculation)
- [ ] 7.2.2 Verify all confidence intervals use Wilson score (not normal approximation)
- [ ] 7.2.3 Verify chi-squared tests have df and expected counts correct
- [ ] 7.2.4 Verify convergence fits (R² calculation) are correct
- [ ] 7.2.5 Peer review by statistician (external validation)

### 7.3 Documentation Review
- [ ] 7.3.1 Verify all formulas are correctly rendered (LaTeX)
- [ ] 7.3.2 Verify all cross-references are valid
- [ ] 7.3.3 Verify all figures have captions, axis labels, legends
- [ ] 7.3.4 Verify glossary terms are used consistently
- [ ] 7.3.5 Run spell check and grammar check
- [ ] 7.3.6 Verify all code snippets are syntactically valid

### 7.4 Code Review
- [ ] 7.4.1 Review all study implementations for correctness
- [ ] 7.4.2 Review all analysis scripts for correctness
- [ ] 7.4.3 Verify ground truth calculations (manual spot checks)
- [ ] 7.4.4 Verify random seed usage is correct (deterministic)
- [ ] 7.4.5 Run linter and fix all warnings
- [ ] 7.4.6 Run type checker and fix all errors

---

## Phase 8: Actionable Recommendations

### 8.1 Immediate Actions (Based on Study Results)
- [ ] 8.1.1 If Study A recommends warmup change: Update FilteredArbitrary constructor
- [ ] 8.1.2 If Study A.4 recommends prior change: Update Beta distribution
- [ ] 8.1.3 If anomaly investigation finds bug: Fix code and re-run
- [ ] 8.1.4 If baselines show large gap to oracle: Create proposal for better CI propagation

### 8.2 Future Work (Based on Study Findings)
- [ ] 8.2.1 If Study I shows warm-start benefit: Create proposal to implement
- [ ] 8.2.2 If Study H shows adaptive warmup benefit: Create proposal to implement
- [ ] 8.2.3 If Study K shows correlation problems: Create proposal to fix
- [ ] 8.2.4 If efficiency gap is large: Create proposal for true Bayesian propagation

### 8.3 Documentation of Decisions
- [ ] 8.3.1 Document all design decisions with references to study results
- [ ] 8.3.2 Update ADRs (Architecture Decision Records) for statistical choices
- [ ] 8.3.3 Add comments in code referencing specific study findings
- [ ] 8.3.4 Create FAQ for common questions about CI behavior

---

## Success Criteria (Overall)

### Documentation Quality
- [ ] All 22 issues from review are addressed
- [ ] Zero mathematical errors or contradictions
- [ ] All terms defined in glossary
- [ ] All formulas correct and cited
- [ ] All figures publication-quality with error bars

### Statistical Rigor
- [ ] All studies have power analysis ≥75% for meaningful effects
- [ ] All sample sizes justified
- [ ] All statistical tests are appropriate (chi-squared, not arbitrary thresholds)
- [ ] All confidence intervals use Wilson score
- [ ] All outliers detected and investigated

### Reproducibility
- [ ] All studies deterministic (same seed → same results)
- [ ] All CSVs version-controlled
- [ ] All code documented and reviewed
- [ ] External replication possible with provided documentation

### Actionable Outcomes
- [ ] At least 2 concrete improvements identified
- [ ] All findings documented with recommendations
- [ ] Tradeoffs clearly explained
- [ ] Stakeholder decisions documented

---

## Timeline Estimate

**Phase 1** (Critical Fixes): 2-3 weeks
**Phase 2** (Enhanced Analysis): 1-2 weeks
**Phase 3** (New Studies): 2-3 weeks per study (H, I: 4-6 weeks; J, K: optional)
**Phase 4** (Enhanced Basic Study): 1 week
**Phase 5** (Code Changes): 1 week (if needed)
**Phase 6** (Documentation): 1 week
**Phase 7** (Validation): 1 week
**Phase 8** (Recommendations): 1 week

**Total**: 12-18 weeks for Phases 1-2 + 4-8 (critical path)
**Optional**: +4-6 weeks for Phase 3 Studies H, I (if pursued)
**Optional**: +2-4 weeks for Phase 3 Studies J, K (if pursued)

---

## Dependencies

- Existing Python toolchain (matplotlib, seaborn, scipy, pandas, numpy)
- Existing TypeScript evidence infrastructure (runner.ts, CSVWriter, etc.)
- Access to computational resources for n=10,000 trials
- Statistician for peer review (Phase 7.2.5)
- Stakeholder input for open questions (design.md section)

---

## Risks

**Risk**: Phase 1 fixes invalidate existing ci-calibration.md results
- **Mitigation**: Preserve existing study, create ci-calibration-v2.md

**Risk**: Anomaly investigation reveals fundamental calibration problem
- **Mitigation**: If coverage consistently <85%, halt and redesign statistical approach

**Risk**: Oracle computation is too expensive (Monte Carlo requires many samples)
- **Mitigation**: Compute oracle for subset of scenarios only

**Risk**: Study I (warm-start) requires breaking changes to FilteredArbitrary
- **Mitigation**: Implement as optional feature flag first

**Risk**: Phases 3-8 timeline too long (12-18 weeks)
- **Mitigation**: Prioritize P0 and P1 only, defer P2 and P3 to future proposal
