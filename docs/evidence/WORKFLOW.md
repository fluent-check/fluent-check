# Evidence Generation Workflow

Simple, packaged workflow for generating statistical evidence. No manual environment activation needed!

## First Time Setup

```bash
npm run evidence:setup
```

This creates a Python virtual environment and installs dependencies. **Only run once.**

## Generate Evidence

### Quick Mode (Development)

```bash
npm run evidence:quick
```

- ⏱️ **Time**: ~5 seconds
- 📊 **Trials**: reduced per study (`QUICK_MODE=1`, varies by study)
- 🎯 **Use for**: Testing, iteration, CI/CD

### Full Mode (Publication)

```bash
npm run evidence
```

- ⏱️ **Time**: ~15-30 seconds  
- 📊 **Trials**: full per study (varies by study)
- 🎯 **Use for**: Final evidence, documentation

## What Gets Generated

### Data Files (`docs/evidence/raw/`)

- `calibration.csv` - Confidence calibration data
- `detection.csv` - Bug detection rate data
- `efficiency.csv` - Property complexity adaptation data
- `exists.csv` - Existential witness detection data
- `shrinking.csv` - Shrinking effectiveness data
- `double_negation.csv` - Double-negation equivalence data
- `composition.csv` - Composition complexity data (paired with `double_negation.csv`)

### Visualizations (`docs/evidence/figures/`)

- `calibration.png` - Calibration curve
- `detection_rates.png` - Detection rate comparison
- `detection_ecdf.png` - Tests-to-termination cumulative distribution
- `efficiency_boxplot.png` - Efficiency comparison
- `exists_detection_rates.png` - Witness detection rates by scenario
- `exists_vs_sample_size.png` - Detection rate vs sample size
- `exists_tests_to_witness.png` - Tests-to-witness distribution
- `shrinking_minimal_rate.png` - Rate of reaching minimal witness
- `shrinking_effort.png` - Shrinking effort vs progress
- `shrinking_time_breakdown.png` - Exploration vs shrinking time
- `shrinking_witness_quality.png` - Witness quality distribution
- `double_neg_detection_rates.png` - Exists vs double-negation detection rates
- `double_neg_composition.png` - Composition complexity comparison
- `double_neg_shrinking.png` - Shrinking comparison

### Report

- `docs/evidence/README.md` - Main evidence report with embedded figures

## Individual Steps

If you need to run steps separately:

### 1. Generate Data Only

```bash
npm run evidence:generate
```

Runs TypeScript experiments, outputs CSV files.

### 2. Analyze Data Only

```bash
npm run evidence:analyze
```

Reads CSV files, generates PNG visualizations.

## Behind the Scenes

### TypeScript → CSV

```
npm run evidence:generate
  → npx tsx scripts/evidence/calibration.study.ts
  → npx tsx scripts/evidence/detection.study.ts  
  → npx tsx scripts/evidence/efficiency.study.ts
  → npx tsx scripts/evidence/exists.study.ts
  → npx tsx scripts/evidence/shrinking.study.ts
  → npx tsx scripts/evidence/double-negation.study.ts
  → Writes docs/evidence/raw/*.csv
```

### Python → PNG

```
npm run evidence:analyze
  → ./scripts/evidence/run-analysis.sh
    → Activates analysis/.venv automatically
    → python analysis/calibration.py
    → python analysis/detection.py
    → python analysis/efficiency.py
    → python analysis/exists.py
    → python analysis/shrinking.py
    → python analysis/double_negation.py
    → Writes docs/evidence/figures/*.png
    → Deactivates venv
```

## Reproducibility

All experiments use deterministic seeds:
```
seed = trial_id * 7919
```

This ensures:
- ✅ Same results on every run
- ✅ Auditable by external reviewers
- ✅ Version control friendly

## Troubleshooting

### Issue: "uv: command not found"

**Solution**: Install uv package manager:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Issue: Python import errors

**Solution**: Recreate environment:
```bash
rm -rf analysis/.venv
npm run evidence:setup
```

### Issue: Missing CSV files

**Solution**: Generate data first:
```bash
npm run evidence:generate
```

### Issue: TypeScript errors

**Solution**: Rebuild project:
```bash
npm run prepare
```

## CI/CD Integration

For automated testing, use quick mode:

```yaml
# .github/workflows/evidence.yml
- name: Generate Evidence
  run: npm run evidence:quick
  
- name: Upload Artifacts
  uses: actions/upload-artifact@v5
  with:
    name: evidence
    path: docs/evidence/
```

## Advanced Usage

### Custom Sample Sizes

Edit environment variable in scripts:
```bash
QUICK_MODE=1 npm run evidence:generate
```

### Modify Studies

Edit scripts in `scripts/evidence/`:
- `calibration.study.ts` - Calibration parameters
- `detection.study.ts` - Bug failure rates
- `efficiency.study.ts` - Property types
- `exists.study.ts` - Existential witness detection scenarios
- `shrinking.study.ts` - Shrinking effectiveness experiments
- `double-negation.study.ts` - Double-negation equivalence and composition metrics

### Modify Analysis

Edit scripts in `analysis/`:
- `calibration.py` - Calibration plot styling
- `detection.py` - Detection rate visualization
- `efficiency.py` - Efficiency plot styling
- `exists.py` - Existential witness plots
- `shrinking.py` - Shrinking plots
- `double_negation.py` - Double-negation plots
- `util.py` - Shared plotting utilities

## Next Steps

After generating evidence:

1. **Review figures**: Open `docs/evidence/figures/*.png`
2. **Check data**: Inspect `docs/evidence/raw/*.csv`
3. **Update report**: Fill in actual numbers in `docs/evidence/README.md`
4. **Commit results**: `git add docs/evidence/ && git commit -m "chore: update evidence"`

## Performance Notes

**Quick Mode** (~5 seconds) and **Full Mode** (~15-30 seconds) run the same set of studies.
Trial counts are reduced in quick mode via `QUICK_MODE=1`; see the study scripts in `scripts/evidence/` for exact parameters.
