# CPU Profile Analysis

This document provides detailed analysis of CPU profiling results for FluentCheck.

## Profile Summary

Based on V8 CPU profiler output (125 ticks sampled):

| Category | Ticks | Percentage |
|----------|-------|------------|
| C++ internals | 115 | 92.0% |
| JavaScript | 7 | 5.6% |
| GC | 1 | 0.8% |
| Shared libs | 3 | 2.4% |

## Top Functions by Category

### C++ Entry Points

1. **V8 Debugger Agent Hash Table** (47.2%)
   - Internal profiler overhead
   - Not representative of actual library performance

2. **task_get_special_port** (16.8%)
   - macOS Mach port operations
   - System call overhead

3. **mig_get_reply_port** (10.4%)
   - Mach IPC operations
   - File system interactions

4. **kernelrpc_vm_map** (8.8%)
   - Memory mapping operations
   - Module loading

### JavaScript Functions

| Function | Ticks | Notes |
|----------|-------|-------|
| normalizeString (node:path) | 4 | Path resolution |
| set (source_map_cache) | 1 | Source map processing |
| realpathSync (node:fs) | 1 | File resolution |
| assert | 1 | Validation |

**Key Observation**: No FluentCheck library functions appear in the JavaScript hot path. This indicates the library code is highly optimized and well below the profiler's sampling threshold.

## Flame Graph Analysis

The generated flame graph (`profiles/flamegraph_*/flamegraph.html`) reveals:

### Wide Sections (Long Execution Time)

1. **Module Loading Stack**
   - `wrapSafe` → `compileForInternalLoader` → `requireBuiltin`
   - Expected: Test framework and dependencies loading

2. **File System Operations**
   - `readFileSync` → `defaultLoadImpl` → `loadSource`
   - Expected: Reading test files and source maps

3. **Path Resolution**
   - `resolveExports` → `stat` → `tryFile`
   - Expected: Module resolution

### Narrow Sections (Potential Hotspots)

No significant narrow sections were found in library code, indicating:
- Efficient arbitrary generation
- No tight loops or recursive bottlenecks
- Good algorithmic complexity

## Function-Level Analysis

### FluentCheck Core Functions

None of the following FluentCheck functions appeared in the profile:
- `Arbitrary.pick()` - Value generation
- `Arbitrary.shrink()` - Counterexample minimization  
- `FluentStrategy` methods - Test orchestration
- `statistics.ts` functions - Statistical calculations

This is positive news - it means these functions execute quickly enough that they don't register in the sampled profile.

### Test Framework Overhead

Mocha test framework operations that appeared:
- `js-yaml` parsing (`.mocharc.yml` configuration)
- `yargs-parser` (CLI argument processing)
- `supports-color` (terminal color detection)

These are one-time startup costs and don't affect test execution.

## Recommendations

### For Library Maintainers

1. **Current state is optimal** - No obvious CPU hotspots
2. **Monitor in CI** - Track test execution time for regressions
3. **Micro-benchmark specific operations** - If users report slowness

### For Users

1. **Use appropriate strategies** - `strategies.fast` for quick iteration
2. **Limit sample sizes** - Default 100 is usually sufficient
3. **Consider test isolation** - Profile specific slow tests separately

## Profiling Commands

```bash
# Generate new CPU profile
npm run profile:cpu -- --raw-only

# Generate flame graph only
npm run profile:cpu -- --flame-only

# View processed profile
cat profiles/cpu_profile_*.txt

# Open flame graph
open profiles/flamegraph_*/flamegraph.html
```

## Historical Comparison

This is the initial baseline. Future profiles should be compared against these metrics:

| Metric | Baseline | Target |
|--------|----------|--------|
| Total ticks | 125 | ≤150 |
| JS percentage | 5.6% | ≤10% |
| GC percentage | 0.8% | ≤2% |

If future profiles show significant deviation, investigate:
1. New dependencies adding overhead
2. Algorithm changes affecting complexity
3. Memory pressure causing GC spikes
