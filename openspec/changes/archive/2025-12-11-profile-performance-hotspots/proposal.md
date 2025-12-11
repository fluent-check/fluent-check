# Change: Profile Performance Hotspots

> **GitHub Issue:** [#375](https://github.com/fluent-check/fluent-check/issues/375)

## Why

Property-based testing frameworks like fluent-check execute arbitraries, shrinking algorithms, and statistical computations thousands of times per test run. Without profiling data, optimization efforts are based on guesswork rather than evidence. This proposal establishes a systematic approach to identify CPU and memory hotspots using the existing test suite as a representative workload.

## What Changes

- **Add profiling infrastructure** using Node.js built-in profiler (V8 CPU profiler) and heap snapshots
- **Create benchmark scripts** that exercise the test suite with profiling enabled
- **Generate flame graphs** and allocation reports to visualize hotspots
- **Document findings** with actionable recommendations for optimization
- **Establish baseline metrics** for future performance regression tracking

### Profiling Targets

1. **CPU profiling**: Identify functions consuming the most execution time
2. **Memory profiling**: Track allocations and identify memory-hungry operations
3. **GC pressure analysis**: Understand garbage collection impact on test execution

### Tools and Approach

- **Node.js `--prof` flag**: V8 CPU profiler for detailed tick-based profiling
- **Node.js `--heap-prof` flag**: Heap allocation tracking
- **`0x` or `clinic.js`**: Flame graph generation for visual analysis
- **`--trace-gc`**: GC event logging for allocation pressure analysis

## Impact

- **Affected specs**: None (investigation-only, no behavior changes)
- **Affected code**: No production code changes; adds `scripts/` tooling
- **New artifacts**:
  - `scripts/profile-cpu.sh` - CPU profiling runner
  - `scripts/profile-heap.sh` - Memory profiling runner
  - `docs/performance/baseline-report.md` - Profiling findings and recommendations
  - `.clinicrc` or equivalent configuration for profiling tools

## Success Criteria

1. **CPU baseline**: Document top 10 functions by execution time with percentages
2. **Memory baseline**: Document top 10 allocation sites by bytes allocated
3. **Hotspot identification**: Identify at least 3 concrete optimization opportunities
4. **Reproducibility**: Profiling can be re-run to measure optimization impact

## Non-Goals

- Implementing optimizations (separate proposals will address specific hotspots)
- Adding performance regression CI (future work after baseline is established)
- Micro-benchmarks for individual arbitraries (may follow as separate effort)
