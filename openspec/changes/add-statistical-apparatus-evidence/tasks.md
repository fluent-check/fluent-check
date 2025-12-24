# Tasks: Add Statistical Apparatus Evidence Studies

## 1. Infrastructure Setup

- [x] 1.1 Verify `analysis/util.py` has all required statistical utilities (wilson_score_interval, chi_squared_test, cohens_h, odds_ratio)
- [x] 1.2 Verify `scripts/evidence/runner.ts` has all required utilities (getSeed, getSampleSize, mulberry32, CSVWriter, ProgressReporter, HighResTimer)
- [x] 1.3 Add any missing utilities to existing files following established patterns
- [x] 1.4 Update `package.json` with individual study run scripts

## 2. Priority 1 Studies (Core Validation)

### 2.1 Biased Sampling Impact Study
- [x] 2.1.1 Implement `scripts/evidence/biased-sampling.study.ts` following design.md template
- [x] 2.1.2 Create `analysis/biased_sampling.py` following design.md template
- [x] 2.1.3 Run study: `npm run evidence:biased-sampling`
- [x] 2.1.4 Run analysis: `cd analysis && python biased_sampling.py`
- [x] 2.1.5 Verify figures in `docs/evidence/figures/biased-sampling.png`
- [x] 2.1.6 Add study summary to `docs/evidence/README.md` with comprehensive conclusions

### 2.2 Weighted Union Probability Study
- [x] 2.2.1 Implement `scripts/evidence/weighted-union.study.ts` following design.md template
- [x] 2.2.2 Create `analysis/weighted_union.py` following design.md template
- [x] 2.2.3 Run study and analysis
- [x] 2.2.4 Verify chi-squared goodness-of-fit (3 of 4 pass p > 0.05, 1 anomaly documented)
- [x] 2.2.5 Add study summary to `docs/evidence/README.md` with comprehensive conclusions

### 2.3 Corner Case Coverage Study
- [x] 2.3.1 Implement `scripts/evidence/corner-case-coverage.study.ts` following design.md template
- [x] 2.3.2 Create `analysis/corner_case_coverage.py` following design.md template
- [x] 2.3.3 Run study and analysis
- [x] 2.3.4 Document 66.7% corner case attribution with nuanced interpretation
- [x] 2.3.5 Add study summary to `docs/evidence/README.md` with comprehensive conclusions

## 3. Priority 2 Studies (Known Gaps)

### 3.1 Filter Cascade Impact Study
- [ ] 3.1.1 Implement `scripts/evidence/filter-cascade.study.ts` following design.md template
- [ ] 3.1.2 Create `analysis/filter_cascade.py` following design.md template
- [ ] 3.1.3 Run study and analysis
- [ ] 3.1.4 Verify credible interval coverage meets 95% target
- [ ] 3.1.5 Add study summary to `docs/evidence/README.md`

### 3.2 Deduplication Efficiency Study
- [ ] 3.2.1 Implement `scripts/evidence/deduplication.study.ts` following design.md template
- [ ] 3.2.2 Create `analysis/deduplication.py` following design.md template
- [ ] 3.2.3 Run study and analysis
- [ ] 3.2.4 Document termination guard trigger rates
- [ ] 3.2.5 Add study summary to `docs/evidence/README.md`

### 3.3 Mapped Arbitrary Size Study
- [ ] 3.3.1 Implement `scripts/evidence/mapped-size.study.ts` following design.md template
- [ ] 3.3.2 Create `analysis/mapped_size.py` following design.md template
- [ ] 3.3.3 Run study and analysis
- [ ] 3.3.4 Document size overestimation ratios for non-bijective maps
- [ ] 3.3.5 Add study summary to `docs/evidence/README.md`

## 4. Priority 3 Studies (Characterization)

### 4.1 Chained Arbitrary Distribution Study
- [ ] 4.1.1 Implement `scripts/evidence/chained-distribution.study.ts` following design.md template
- [ ] 4.1.2 Create `analysis/chained_distribution.py` following design.md template
- [ ] 4.1.3 Run study and analysis
- [ ] 4.1.4 Verify chi-squared goodness-of-fit for theoretical distribution
- [ ] 4.1.5 Add study summary to `docs/evidence/README.md`

### 4.2 Shrinking Fairness Study
- [ ] 4.2.1 Implement `scripts/evidence/shrinking-fairness.study.ts` following design.md template
- [ ] 4.2.2 Create `analysis/shrinking_fairness.py` following design.md template
- [ ] 4.2.3 Run study and analysis
- [ ] 4.2.4 Document position effect if statistically significant
- [ ] 4.2.5 Add study summary to `docs/evidence/README.md`

### 4.3 Length Distribution Study
- [ ] 4.3.1 Implement `scripts/evidence/length-distribution.study.ts` following design.md template
- [ ] 4.3.2 Create `analysis/length_distribution.py` following design.md template
- [ ] 4.3.3 Run study and analysis
- [ ] 4.3.4 Recommend optimal length distribution if findings warrant
- [ ] 4.3.5 Add study summary to `docs/evidence/README.md`

## 5. Priority 4 Studies (Nice to Have)

### 5.1 Caching Trade-off Study
- [ ] 5.1.1 Implement `scripts/evidence/caching-tradeoff.study.ts` following design.md template
- [ ] 5.1.2 Create `analysis/caching_tradeoff.py` following design.md template
- [ ] 5.1.3 Run study and analysis
- [ ] 5.1.4 Quantify detection loss vs time savings
- [ ] 5.1.5 Add study summary to `docs/evidence/README.md`

### 5.2 Streaming Statistics Accuracy Study
- [ ] 5.2.1 Implement `scripts/evidence/streaming-accuracy.study.ts` following design.md template
- [ ] 5.2.2 Create `analysis/streaming_accuracy.py` following design.md template
- [ ] 5.2.3 Run study and analysis
- [ ] 5.2.4 Verify 5% accuracy threshold for n > 100
- [ ] 5.2.5 Add study summary to `docs/evidence/README.md`

### 5.3 Sample Budget Distribution Study
- [ ] 5.3.1 Implement `scripts/evidence/sample-budget.study.ts` following design.md template
- [ ] 5.3.2 Create `analysis/sample_budget.py` following design.md template
- [ ] 5.3.3 Run study and analysis
- [ ] 5.3.4 Document detection rate by quantifier depth
- [ ] 5.3.5 Add study summary to `docs/evidence/README.md`

## 6. Documentation and Integration

- [ ] 6.1 Update `docs/evidence/README.md` with new study index and key findings
- [ ] 6.2 Update `package.json` with individual study run scripts following pattern:
      - `evidence:biased-sampling`, `evidence:weighted-union`, etc.
- [ ] 6.3 Add `npm run evidence:apparatus` to run all 12 apparatus studies
- [ ] 6.4 Add `npm run evidence:apparatus:quick` for quick mode (QUICK_MODE=1)
- [ ] 6.5 Document key findings and actionable recommendations in README
- [ ] 6.6 Create follow-up proposals for any issues discovered

## 7. Validation

- [ ] 7.1 Run all studies in quick mode: `QUICK_MODE=1 npm run evidence:apparatus`
- [ ] 7.2 Verify all CSVs are deterministic by running twice with same seed
- [ ] 7.3 Run all Python analyses and verify figures generate without errors
- [ ] 7.4 Verify all figures render correctly in `docs/evidence/README.md`
- [ ] 7.5 Run full mode on at least P1 studies: `npm run evidence:biased-sampling`
- [ ] 7.6 Run `npx openspec validate add-statistical-apparatus-evidence --strict`
