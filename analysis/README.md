# Evidence Analysis Scripts

Python scripts for analyzing confidence-based termination evidence data and generating publication-quality visualizations.

## Setup

### Prerequisites

- Python 3.10 or later
- [uv](https://docs.astral.sh/uv/) package manager

### Installation

1. Install uv (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. Initialize the Python environment:
   ```bash
   cd analysis
   uv sync
   ```

This will create a virtual environment in `.venv/` and install all dependencies (matplotlib, seaborn, pandas, numpy, scipy).

## Usage

### From Project Root

Run all analysis scripts:
```bash
npm run evidence:analyze
```

This runs:
- `calibration.py` - Generates calibration curve
- `detection.py` - Generates detection rate comparison charts
- `efficiency.py` - Generates efficiency box plot

### Individual Scripts

Run specific analysis:
```bash
cd analysis
uv run calibration.py
uv run detection.py
uv run efficiency.py
```

Or activate the virtual environment:
```bash
cd analysis
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

python calibration.py
python detection.py
python efficiency.py

deactivate
```

## Input Data

Scripts read CSV files from `../docs/evidence/raw/`:
- `calibration.csv` - Calibration study results
- `detection.csv` - Detection rate study results
- `efficiency.csv` - Efficiency study results

Generate data with:
```bash
npm run evidence:generate
```

## Output

Figures are saved to `../docs/evidence/figures/`:
- `calibration.png` - Calibration curve (predicted vs observed confidence)
- `detection_rates.png` - Detection rate bar chart with error bars
- `detection_histogram.png` - Tests-to-termination histogram
- `efficiency_boxplot.png` - Box plot comparing property types

## Dependencies

- **matplotlib** (≥3.8.0) - Core plotting library
- **seaborn** (≥0.13.0) - Statistical visualizations
- **pandas** (≥2.1.0) - Data manipulation
- **numpy** (≥1.26.0) - Numerical operations
- **scipy** (≥1.11.0) - Statistical functions

See [`pyproject.toml`](pyproject.toml) for complete dependency specifications.

## Utilities

`util.py` provides shared functions:
- `wilson_score_interval()` - Confidence intervals for proportions
- `save_figure()` - Consistent figure saving
- `compute_summary_stats()` - Summary statistics
- `print_summary_table()` - Formatted output

## Troubleshooting

### uv not found
Install from https://docs.astral.sh/uv/

### Import errors
Run `uv sync` to reinstall dependencies

### Missing CSV files
Run `npm run evidence:generate` first

### Python version too old
Requires Python 3.10+. Check with `python --version`
