# Change: Add Scientific Evidence Suite for Confidence-Based Termination

## Why

The current evidence in `test/confidence.test.ts` is insufficient and reads like unit tests dressed as proof. It contains:
- Binary pass/fail assertions instead of distributions
- Single runs instead of Monte Carlo trials
- No calibration validation
- No visualizable data (histograms, plots)
- Unfalsifiable claims ("demonstrates comprehensive exploration")

This undermines trust in the confidence-based termination feature. To establish scientific credibility, we need auditable, reproducible evidence with proper statistical analysis and publication-quality visualizations.

## What Changes

- **Add TypeScript experiment runners** that execute Monte Carlo trials (500-1000 runs) and output raw CSV data
- **Add Python analysis pipeline** (uv-managed) that reads CSVs and generates matplotlib/seaborn plots
- **Add evidence documentation** in `docs/evidence/` with embedded figures demonstrating:
  - Calibration accuracy (claimed vs observed confidence)
  - Detection rate improvements (confidence-based vs fixed N)
  - Efficiency adaptation (tests-to-termination distributions)
- **Remove theatrical evidence** from `test/confidence.test.ts` (the "Confidence Value Proposition" section)
- **Keep unit/integration tests** in `test/confidence.test.ts` (API correctness verification)

## Impact

- **Affected specs**: testing (new evidence capability)
- **Affected code**:
  - New: `scripts/evidence/*.ts` (experiment runners)
  - New: `analysis/*.py` (plotting scripts)
  - New: `docs/evidence/` (reports, CSVs, PNGs)
  - Modified: `test/confidence.test.ts` (remove theatrical evidence section)
  - Modified: `package.json` (add `npm run evidence` scripts)
- **Dependencies**: Adds Python toolchain (uv, matplotlib, seaborn, pandas) for analysis
- **CI/CD**: Evidence generation is manual (not in CI) due to ~5-10 minute runtime
- **Breaking changes**: None (evidence is documentation, not API)

## Rationale

Scientific evidence requires:
1. **Reproducibility**: Deterministic seeds, version-controlled CSV data
2. **Statistical rigor**: Confidence intervals on all claims, proper sample sizes
3. **Auditability**: Raw data reviewable by external parties
4. **Visualization**: Histograms, calibration plots, boxplots for human understanding

Current "evidence" fails all four criteria. This proposal establishes FluentCheck's confidence feature with the same rigor expected in academic publication.
