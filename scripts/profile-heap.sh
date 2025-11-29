#!/usr/bin/env bash
#
# Heap/Memory Profiling Script for FluentCheck
#
# Generates heap profiles and GC traces from test suite execution.
# Output is written to the profiles/ directory.
#
# Usage:
#   ./scripts/profile-heap.sh              # Generate heap profile + GC trace
#   ./scripts/profile-heap.sh --heap-only  # Only generate heap profile
#   ./scripts/profile-heap.sh --gc-only    # Only trace GC events
#
# Prerequisites:
#   - Node.js v22+
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
HEAP_ONLY=false
GC_ONLY=false

for arg in "$@"; do
    case $arg in
        --heap-only)
            HEAP_ONLY=true
            ;;
        --gc-only)
            GC_ONLY=true
            ;;
        --help|-h)
            echo "Usage: $0 [--heap-only|--gc-only]"
            echo ""
            echo "Options:"
            echo "  --heap-only     Only generate heap profile"
            echo "  --gc-only       Only trace GC events"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"

# Generate heap profile
if [ "$GC_ONLY" = false ]; then
    log_info "Generating heap profile..."
    log_info "This may take a few minutes..."
    
    # Clean up any existing heap profiles in project root
    rm -f "$PROJECT_ROOT"/Heap.*.heapprofile
    
    # Run with heap profiler
    node --heap-prof --heap-prof-dir="$PROFILE_DIR" --enable-source-maps ./node_modules/.bin/mocha 2>&1 | tee "$PROFILE_DIR/heap_test_output_$TIMESTAMP.log"
    
    # Find the generated heap profile
    HEAP_PROFILE=$(ls -t "$PROFILE_DIR"/Heap.*.heapprofile 2>/dev/null | head -1)
    if [ -n "$HEAP_PROFILE" ]; then
        # Rename with timestamp for clarity
        NEW_NAME="$PROFILE_DIR/heap_profile_$TIMESTAMP.heapprofile"
        mv "$HEAP_PROFILE" "$NEW_NAME"
        log_info "Heap profile generated: $NEW_NAME"
        log_info "Open in Chrome DevTools: chrome://inspect -> Open dedicated DevTools for Node -> Memory tab"
    else
        log_warn "No heap profile found"
    fi
fi

# Trace GC events
if [ "$HEAP_ONLY" = false ]; then
    log_info "Tracing GC events..."
    
    GC_LOG="$PROFILE_DIR/gc_trace_$TIMESTAMP.log"
    
    # Run with GC tracing
    node --trace-gc --enable-source-maps ./node_modules/.bin/mocha 2>&1 | tee "$GC_LOG"
    
    # Analyze GC trace
    log_info "GC trace saved: $GC_LOG"
    
    echo ""
    log_info "=== GC Summary ==="
    
    # Count GC events by type
    SCAVENGE_COUNT=$(grep -c "Scavenge" "$GC_LOG" 2>/dev/null || echo "0")
    MARK_SWEEP_COUNT=$(grep -c "Mark-Compact\|Mark-sweep" "$GC_LOG" 2>/dev/null || echo "0")
    
    echo "  Scavenge (minor GC) events: $SCAVENGE_COUNT"
    echo "  Mark-Compact (major GC) events: $MARK_SWEEP_COUNT"
    
    # Calculate total GC time if possible
    GC_TIME=$(grep -oE "[0-9]+\.[0-9]+ ms" "$GC_LOG" 2>/dev/null | awk '{sum += $1} END {printf "%.2f", sum}')
    if [ -n "$GC_TIME" ]; then
        echo "  Approximate total GC time: ${GC_TIME} ms"
    fi
    
    # Show sample of GC events
    echo ""
    log_info "=== Sample GC Events (first 10) ==="
    grep -E "^\[" "$GC_LOG" 2>/dev/null | head -10 || true
fi

echo ""
log_info "Memory profiling complete!"
log_info "Output directory: $PROFILE_DIR"
echo ""
log_info "Analysis tips:"
echo "  - Load .heapprofile files in Chrome DevTools Memory tab"
echo "  - Look for large retained sizes and allocation counts"
echo "  - Frequent Scavenge GCs indicate high allocation rate"
echo "  - Mark-Compact GCs indicate memory pressure"
