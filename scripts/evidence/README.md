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

**All Studies** (Core + Apparatus):
```bash
npm run evidence:all
```

## Individual Commands

You can run specific studies using the helper command:

```bash
# Run a specific study (TS generation + Python analysis)
npm run evidence:study calibration

# Run in quick mode
npm run evidence:study calibration --quick

# Run all apparatus studies
npm run evidence:apparatus
```

## Scripts

### Executor Script

- **`execute.ts`** - The main entry point. Orchestrates:
  1. Parsing arguments
  2. Setting environment variables (`QUICK_MODE`)
  3. Running TypeScript generation scripts
  4. Running Python analysis scripts (in `.venv`)

### TypeScript Scripts

- **`runner.ts`** - Shared utilities
  - `mulberry32` - Deterministic PRNG
  - `CSVWriter` - CSV file writer
  - `ProgressReporter` - Progress bars
  - `getSeed` - Deterministic seed generation

- **`registry.ts`** - Registry of all available studies and their metadata

### Individual Studies

All study scripts follow the pattern `*.study.ts` and are registered in `registry.ts`.

## Environment Variables

- `QUICK_MODE=1` - Use reduced sample sizes for faster iteration
  - Automatically set by adding `--quick` flag to commands.

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
│   └── ...
└── figures/                # PNG visualizations (version-controlled)
    ├── calibration.png
    ├── detection_rates.png
    └── ...
```