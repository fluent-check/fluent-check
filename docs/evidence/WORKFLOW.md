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
- 📊 **Trials**: reduced per study (via `--quick`)
- 🎯 **Use for**: Testing, iteration, CI/CD
- ℹ️ **Includes**: Core confidence studies only

### Full Mode (Publication)

```bash
npm run evidence
```

- ⏱️ **Time**: ~15-30 seconds  
- 📊 **Trials**: full per study
- 🎯 **Use for**: Final evidence, documentation
- ℹ️ **Includes**: Core confidence studies only

### Run All Studies (Core + Apparatus)

```bash
npm run evidence:all
```

Runs the complete suite of statistical validation studies.

## Run Specific Studies

You can run studies individually or by category:

```bash
# Run all "Apparatus" studies (biased sampling, corner cases, etc.)
npm run evidence:apparatus

# Run a specific study (e.g., calibration)
npm run evidence:study calibration

# Run a specific study in quick mode
npm run evidence:study calibration --quick
```

## What Gets Generated

### Data Files (`docs/evidence/raw/`)

- `calibration.csv` - Confidence calibration data
- `detection.csv` - Bug detection rate data
- `efficiency.csv` - Property complexity adaptation data
- ...and many others

### Visualizations (`docs/evidence/figures/`)

- `calibration.png` - Calibration curve
- `detection_rates.png` - Detection rate comparison
- `efficiency_boxplot.png` - Efficiency comparison
- ...and many others

### Report

- `docs/evidence/README.md` - Main evidence report with embedded figures

## Behind the Scenes

The unified executor (`scripts/evidence/execute.ts`) handles both data generation and analysis for each study sequentially.

```
npm run evidence
  → npx tsx scripts/evidence/execute.ts --core
    → For each study (e.g., calibration):
      1. Runs TypeScript: npx tsx scripts/evidence/calibration.study.ts
      2. Runs Python: analysis/.venv/bin/python analysis/calibration.py
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