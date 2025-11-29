# FluentCheck Scripts

This directory contains development and profiling scripts for FluentCheck.

## Performance Profiling

FluentCheck includes profiling tools to identify CPU and memory hotspots in the library. These tools help contributors understand performance characteristics and validate optimization efforts.

### Prerequisites

- Node.js v22 or later
- All dev dependencies installed (`npm install`)
- Unix-like environment (macOS, Linux, or WSL on Windows)

### Quick Start

```bash
# CPU profiling with flame graph
npm run profile:cpu

# Memory/heap profiling
npm run profile:heap
```

### CPU Profiling

The `profile-cpu.sh` script generates CPU profiles and flame graphs:

```bash
# Full profiling (flame graph + raw V8 profile)
./scripts/profile-cpu.sh

# Only flame graph (faster, visual analysis)
./scripts/profile-cpu.sh --flame-only

# Only raw V8 profile (detailed text output)
./scripts/profile-cpu.sh --raw-only
```

**Output:**
- `profiles/flamegraph_<timestamp>/` - Interactive HTML flame graph (open in browser)
- `profiles/cpu_profile_<timestamp>.txt` - Processed V8 profile with function statistics

**Reading Flame Graphs:**
- Width represents time spent in function (wider = more time)
- Stack grows upward (callers below, callees above)
- Color is random but consistent per function
- Click to zoom into a stack frame

### Memory Profiling

The `profile-heap.sh` script analyzes memory allocation patterns:

```bash
# Full profiling (heap profile + GC trace)
./scripts/profile-heap.sh

# Only heap profile
./scripts/profile-heap.sh --heap-only

# Only GC trace (lightweight)
./scripts/profile-heap.sh --gc-only
```

**Output:**
- `profiles/heap_profile_<timestamp>.heapprofile` - Heap allocation profile
- `profiles/gc_trace_<timestamp>.log` - Garbage collection event log

**Analyzing Heap Profiles:**
1. Open Chrome/Chromium
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"
4. Go to Memory tab
5. Load the `.heapprofile` file

**Understanding GC Traces:**
- **Scavenge**: Minor GC, collects young generation (frequent = high allocation rate)
- **Mark-Compact**: Major GC, full heap collection (frequent = memory pressure)

### Profile Output Directory

All profiling artifacts are saved to the `profiles/` directory, which is git-ignored. Profiles can be large (10-100MB) and are regenerated on demand.

### Interpreting Results

#### CPU Hotspots to Look For

1. **Arbitrary generation**: Time spent in `pick()`, `shrink()` methods
2. **Random number generation**: Calls to `Math.random()` or RNG utilities
3. **Array/string allocation**: Loops creating many objects
4. **Type operations**: Any runtime type checking overhead
5. **Strategy iteration**: Time in `FluentStrategy` state management

#### Memory Hotspots to Look For

1. **Large object allocations**: Arrays, strings, or complex objects
2. **Retained references**: Objects not being garbage collected
3. **High GC frequency**: Indicates allocation pressure
4. **Growing heap size**: Possible memory leaks

### Comparing Before/After Optimization

1. Run profiling on the baseline code
2. Note key metrics (top 10 functions, GC counts, total time)
3. Apply optimization
4. Run profiling again with same workload
5. Compare metrics to validate improvement

### Troubleshooting

**"Command not found" error:**
```bash
chmod +x scripts/profile-cpu.sh scripts/profile-heap.sh
```

**0x fails to generate flame graph:**
- Ensure tests pass first: `npm test`
- Try with longer-running tests for better sampling

**Heap profile is empty or very small:**
- The test suite may complete too quickly for meaningful allocation data
- Consider running specific slow tests multiple times

### Related Documentation

- [Baseline Performance Report](../docs/performance/baseline-report.md)
- [CPU Profile Analysis](../docs/performance/cpu-profile.md)
- [Memory Profile Analysis](../docs/performance/memory-profile.md)
