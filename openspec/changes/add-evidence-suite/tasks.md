# Implementation Tasks: Add Evidence Suite

## 1. TypeScript Experiment Infrastructure

- [ ] 1.1 Create `scripts/evidence/runner.ts` with shared utilities
  - [ ] 1.1.1 Implement mulberry32 PRNG for deterministic seeds
  - [ ] 1.1.2 Create CSV writer utility
  - [ ] 1.1.3 Add progress reporting for long-running experiments
- [ ] 1.2 Create `scripts/evidence/calibration.study.ts`
  - [ ] 1.2.1 Run 1000 trials at confidence levels: 0.80, 0.90, 0.95, 0.99
  - [ ] 1.2.2 Test with true pass rates: 0.999, 0.9999
  - [ ] 1.2.3 Output to `docs/evidence/raw/calibration.csv`
- [ ] 1.3 Create `scripts/evidence/detection.study.ts`
  - [ ] 1.3.1 Implement rare bug property (x % 500 !== 0, 0.2% failure rate)
  - [ ] 1.3.2 Run 500 trials for each method: Fixed N=100, N=500, Conf 90%/95%/99%
  - [ ] 1.3.3 Output to `docs/evidence/raw/detection.csv`
- [ ] 1.4 Create `scripts/evidence/efficiency.study.ts`
  - [ ] 1.4.1 Test always-true property (x * x >= 0)
  - [ ] 1.4.2 Test 1% failure rate property (x % 100 !== 0)
  - [ ] 1.4.3 Run 200 trials each at 95% confidence
  - [ ] 1.4.4 Output to `docs/evidence/raw/efficiency.csv`

## 2. Python Analysis Infrastructure

- [ ] 2.1 Set up Python environment
  - [ ] 2.1.1 Create `analysis/pyproject.toml` with uv dependencies
  - [ ] 2.1.2 Add matplotlib, seaborn, pandas, numpy, scipy
  - [ ] 2.1.3 Create `.python-version` file
  - [ ] 2.1.4 Add `analysis/.gitignore` for `.venv/`
- [ ] 2.2 Create `analysis/util.py` with shared functions
  - [ ] 2.2.1 Confidence interval calculation (Wilson score)
  - [ ] 2.2.2 Plot styling utilities
  - [ ] 2.2.3 CSV loading helpers
- [ ] 2.3 Create `analysis/calibration.py`
  - [ ] 2.3.1 Load `docs/evidence/raw/calibration.csv`
  - [ ] 2.3.2 Compute summary statistics with CIs
  - [ ] 2.3.3 Generate calibration plot (predicted vs observed)
  - [ ] 2.3.4 Save to `docs/evidence/figures/calibration.png`
- [ ] 2.4 Create `analysis/detection.py`
  - [ ] 2.4.1 Load `docs/evidence/raw/detection.csv`
  - [ ] 2.4.2 Generate detection rate bar chart with error bars
  - [ ] 2.4.3 Generate tests-to-termination histogram
  - [ ] 2.4.4 Save figures to `docs/evidence/figures/`
- [ ] 2.5 Create `analysis/efficiency.py`
  - [ ] 2.5.1 Load `docs/evidence/raw/efficiency.csv`
  - [ ] 2.5.2 Generate box plot comparing property types
  - [ ] 2.5.3 Compute summary table (mean, std, percentiles)
  - [ ] 2.5.4 Save to `docs/evidence/figures/efficiency_boxplot.png`

## 3. Documentation

- [ ] 3.1 Create `docs/evidence/README.md`
  - [ ] 3.1.1 Add calibration study section with embedded PNG
  - [ ] 3.1.2 Add detection rate study section with embedded PNG
  - [ ] 3.1.3 Add efficiency study section with embedded PNG
  - [ ] 3.1.4 Include interpretation and conclusions
- [ ] 3.2 Create `docs/evidence/raw/.gitkeep`
- [ ] 3.3 Create `docs/evidence/figures/.gitkeep`
- [ ] 3.4 Update `docs/statistical-confidence.md` to reference evidence

## 4. Build System Integration

- [ ] 4.1 Add npm scripts to `package.json`
  - [ ] 4.1.1 `evidence:generate` - Run all TS studies
  - [ ] 4.1.2 `evidence:analyze` - Run all Python scripts
  - [ ] 4.1.3 `evidence` - Run both phases sequentially
  - [ ] 4.1.4 `evidence:quick` - Reduced sample sizes for development
- [ ] 4.2 Add `analysis/` to workspace documentation

## 5. Cleanup

- [ ] 5.1 Remove "Confidence Value Proposition (Evidence)" section from `test/confidence.test.ts`
  - [ ] 5.1.1 Keep unit tests for `calculateBayesianConfidence`
  - [ ] 5.1.2 Keep unit tests for `calculateCredibleInterval`
  - [ ] 5.1.3 Keep integration tests for API (withConfidence, checkWithConfidence)
  - [ ] 5.1.4 Remove lines 440-800 (evidence tests that are now proper studies)

## 6. Validation

- [ ] 6.1 Run `npm run evidence:generate` and verify CSV output
- [ ] 6.2 Run `npm run evidence:analyze` and verify PNG output
- [ ] 6.3 Verify `docs/evidence/README.md` displays images correctly
- [ ] 6.4 Run `npm test` to ensure no regressions
- [ ] 6.5 Commit CSVs and PNGs to demonstrate baseline evidence
