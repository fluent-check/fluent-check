#!/bin/bash
# Set up Python environment for evidence analysis
# Only needs to be run once (or after clean)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANALYSIS_DIR="$PROJECT_ROOT/analysis"

echo "Setting up Python environment for evidence analysis..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed"
    echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create venv and install dependencies
cd "$ANALYSIS_DIR"

if [ -d ".venv" ]; then
    echo "Removing existing virtual environment..."
    rm -rf .venv
fi

echo "Creating virtual environment..."
uv venv

echo "Installing dependencies..."
uv pip install matplotlib seaborn pandas numpy scipy

echo ""
echo "✓ Python environment setup complete"
echo "  Location: $ANALYSIS_DIR/.venv"
echo ""
echo "You can now run: npm run evidence"
