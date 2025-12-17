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
- 📊 **Samples**: 50-100 trials per study
- 🎯 **Use for**: Testing, iteration, CI/CD

### Full Mode (Publication)

```bash
npm run evidence
```

- ⏱️ **Time**: ~15-30 seconds  
- 📊 **Samples**: 200-1000 trials per study
- 🎯 **Use for**: Final evidence, documentation

## What Gets Generated

### Data Files (`docs/evidence/raw/`)

- `calibration.csv` - Confidence calibration data
- `detection.csv` - Bug detection rate data
- `efficiency.csv` - Property complexity adaptation data

### Visualizations (`docs/evidence/figures/`)

- `calibration.png` - Calibration curve
- `detection_rates.png` - Detection rate comparison
- `detection_ecdf.png` - Tests-to-termination cumulative distribution
- `efficiency_boxplot.png` - Efficiency comparison

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
  uses: actions/upload-artifact@v3
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

### Modify Analysis

Edit scripts in `analysis/`:
- `calibration.py` - Calibration plot styling
- `detection.py` - Detection rate visualization
- `efficiency.py` - Efficiency plot styling
- `util.py` - Shared plotting utilities

## Next Steps

After generating evidence:

1. **Review figures**: Open `docs/evidence/figures/*.png`
2. **Check data**: Inspect `docs/evidence/raw/*.csv`
3. **Update report**: Fill in actual numbers in `docs/evidence/README.md`
4. **Commit results**: `git add docs/evidence/ && git commit -m "chore: update evidence"`

## Performance Notes

**Quick Mode** (~5 seconds):
- Calibration: 100 trials per confidence level (400 total)
- Detection: 50 trials per method (250 total)
- Efficiency: 50 trials per property (100 total)

**Full Mode** (~15-30 seconds):
- Calibration: 1000 trials per confidence level (4000 total)
- Detection: 500 trials per method (2500 total)
- Efficiency: 200 trials per property (400 total)
