# Evidence Generation Scripts

Scripts for generating and analyzing statistical evidence for confidence-based termination.

## Quick Start

### First Time Setup

```bash
npm run evidence:setup
```

This installs Python dependencies in `analysis/.venv` using uv. Only needs to be run once.

### Generate Evidence

**Quick mode** (reduced sample sizes, ~1 minute):
```bash
npm run evidence:quick
```

**Full mode** (200-500 trials per config, ~15-30 seconds):
```bash
npm run evidence
```

## Individual Commands

### TypeScript Experiments → CSV

```bash
npm run evidence:generate
```

Runs three studies:
- `calibration.study.ts` - Tests confidence calibration accuracy
- `detection.study.ts` - Compares bug detection rates
- `efficiency.study.ts` - Tests adaptation to property complexity

Output: `docs/evidence/raw/*.csv`

### Python Analysis → PNG

```bash
npm run evidence:analyze
```

Reads CSV files and generates visualizations:
- `calibration.py` - Calibration curve
- `detection.py` - Detection rate charts
- `efficiency.py` - Efficiency box plots

Output: `docs/evidence/figures/*.png`

## Scripts

### Shell Scripts

- **`setup-python.sh`** - One-time Python environment setup
  - Creates virtual environment in `analysis/.venv`
  - Installs matplotlib, seaborn, pandas, numpy, scipy
  - Checks for uv installation

- **`run-analysis.sh`** - Run Python analysis with automatic venv activation
  - Activates `.venv` automatically
  - Runs all three analysis scripts
  - Deactivates when done

### TypeScript Scripts

- **`runner.ts`** - Shared utilities
  - `mulberry32` - Deterministic PRNG
  - `CSVWriter` - CSV file writer
  - `ProgressReporter` - Progress bars
  - `getSeed` - Deterministic seed generation

- **`calibration.study.ts`** - Calibration experiments
- **`detection.study.ts`** - Detection rate experiments
- **`efficiency.study.ts`** - Efficiency experiments

## Environment Variables

- `QUICK_MODE=1` - Use reduced sample sizes for faster iteration
  - Calibration: 100 trials per level (instead of 1000)
  - Detection: 50 trials per method (instead of 500)
  - Efficiency: 50 trials per property (instead of 200)

## Troubleshooting

### "uv: command not found"

Install uv:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Python environment issues

Recreate the environment:
```bash
npm run evidence:setup
```

### Missing CSV files

Generate data first:
```bash
npm run evidence:generate
```

### TypeScript compilation errors

Rebuild:
```bash
npm run prepare
```

## Output Files

```
docs/evidence/
├── raw/                    # CSV data (version-controlled)
│   ├── calibration.csv
│   ├── detection.csv
│   └── efficiency.csv
└── figures/                # PNG visualizations (version-controlled)
    ├── calibration.png
    ├── detection_rates.png
    ├── detection_ecdf.png
    └── efficiency_boxplot.png
```
