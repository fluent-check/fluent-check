#!/bin/bash
# Run Python evidence analysis scripts
# Automatically activates virtual environment and runs all analysis

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANALYSIS_DIR="$PROJECT_ROOT/analysis"

# Check if venv exists, create if not
if [ ! -d "$ANALYSIS_DIR/.venv" ]; then
    echo "Creating Python virtual environment..."
    cd "$ANALYSIS_DIR"
    uv venv
    uv pip install matplotlib seaborn pandas numpy scipy
fi

# Activate venv and run analysis scripts
cd "$ANALYSIS_DIR"
source .venv/bin/activate

echo "Running Python analysis..."
python calibration.py
python detection.py
python efficiency.py

deactivate

echo ""
echo "✓ All analysis complete"
echo "  Figures saved to: docs/evidence/figures/"
