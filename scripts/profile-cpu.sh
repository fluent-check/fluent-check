#!/usr/bin/env bash
#
# CPU Profiling Script for FluentCheck
#
# Generates V8 CPU profiles and flame graphs from test suite execution.
# Output is written to the profiles/ directory.
#
# Usage:
#   ./scripts/profile-cpu.sh              # Generate V8 profile + flame graph
#   ./scripts/profile-cpu.sh --flame-only # Only generate flame graph via 0x
#   ./scripts/profile-cpu.sh --raw-only   # Only generate raw V8 profile
#
# Prerequisites:
#   - Node.js v22+
#   - npm install (to install 0x devDependency)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROFILE_DIR="$PROJECT_ROOT/profiles"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure profiles directory exists
mkdir -p "$PROFILE_DIR"

# Parse arguments
FLAME_ONLY=false
RAW_ONLY=false

for arg in "$@"; do
    case $arg in
        --flame-only)
            FLAME_ONLY=true
            ;;
        --raw-only)
            RAW_ONLY=true
            ;;
        --help|-h)
            echo "Usage: $0 [--flame-only|--raw-only]"
            echo ""
            echo "Options:"
            echo "  --flame-only    Only generate flame graph via 0x"
            echo "  --raw-only      Only generate raw V8 profile"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"

# Generate flame graph using 0x
if [ "$RAW_ONLY" = false ]; then
    log_info "Generating flame graph with 0x..."
    log_info "This may take a few minutes..."
    
    # 0x generates output in current directory, move to profiles after
    npx 0x --output-dir "$PROFILE_DIR/flamegraph_$TIMESTAMP" -- node ./node_modules/.bin/mocha 2>&1 | tee "$PROFILE_DIR/0x_output_$TIMESTAMP.log"
    
    log_info "Flame graph generated at: $PROFILE_DIR/flamegraph_$TIMESTAMP"
    
    # Find and report the HTML file location
    FLAMEGRAPH_HTML=$(find "$PROFILE_DIR/flamegraph_$TIMESTAMP" -name "*.html" 2>/dev/null | head -1)
    if [ -n "$FLAMEGRAPH_HTML" ]; then
        log_info "Open flame graph: $FLAMEGRAPH_HTML"
    fi
fi

# Generate raw V8 profile
if [ "$FLAME_ONLY" = false ]; then
    log_info "Generating raw V8 CPU profile..."
    
    # Clean up any existing isolate logs
    rm -f "$PROJECT_ROOT"/isolate-*.log
    
    # Run with V8 profiler
    node --prof --enable-source-maps ./node_modules/.bin/mocha 2>&1 | tee "$PROFILE_DIR/test_output_$TIMESTAMP.log"
    
    # Process the V8 log file
    ISOLATE_LOG=$(ls -t "$PROJECT_ROOT"/isolate-*.log 2>/dev/null | head -1)
    if [ -n "$ISOLATE_LOG" ]; then
        log_info "Processing V8 profile: $ISOLATE_LOG"
        node --prof-process "$ISOLATE_LOG" > "$PROFILE_DIR/cpu_profile_$TIMESTAMP.txt"
        
        # Move isolate log to profiles directory
        mv "$ISOLATE_LOG" "$PROFILE_DIR/"
        
        log_info "CPU profile processed: $PROFILE_DIR/cpu_profile_$TIMESTAMP.txt"
        
        # Show summary
        echo ""
        log_info "=== Top Functions by Self Time ==="
        head -100 "$PROFILE_DIR/cpu_profile_$TIMESTAMP.txt" | grep -A 50 "Bottom up" | head -25 || true
    else
        log_warn "No V8 profile log found"
    fi
fi

echo ""
log_info "Profiling complete!"
log_info "Output directory: $PROFILE_DIR"
