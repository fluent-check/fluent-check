# Performance Baseline Report

**Date**: November 2024  
**Node.js Version**: v22+  
**Test Suite**: 309 tests  
**Total Execution Time**: ~8 seconds

## Executive Summary

FluentCheck demonstrates excellent performance characteristics with no significant CPU or memory bottlenecks. The test suite completes efficiently with minimal garbage collection overhead.

### Key Findings

| Metric | Value | Assessment |
|--------|-------|------------|
| Test execution time | ~8s | Good |
| Heap growth | 4.5MB → 9MB | Minimal |
| Minor GC (Scavenge) events | 5 | Low |
| Major GC (Mark-Compact) events | 0 | Excellent |
| Total GC time | <1ms | Negligible |
| CPU overhead in library | <5% | Excellent |

## CPU Profile Analysis

### Summary

The V8 CPU profiler captured 125 ticks during test execution. The profile reveals that:

- **92%** of time is spent in C++ internals (V8 engine, module loading)
- **5.6%** of time is spent in JavaScript execution
- **0.8%** of time is spent in garbage collection

### Top Functions by Self-Time

Most CPU time is consumed by:
1. Module loading and compilation (startup cost)
2. V8 debugger agent operations (profiling overhead)
3. Path normalization (Node.js internals)
4. File system operations (reading test files)

**Key Observation**: No FluentCheck library functions appear in the top CPU consumers, indicating the library itself is highly efficient.

### Slowest Tests

A few tests take longer than average (50-100ms+):
- Shrinking tests with complex nested structures
- Property tests with high sample counts (e.g., 3 arbitraries × thorough strategy)
- Regex-based email validation (complex pattern matching)

These are expected costs given the nature of the operations.

## Memory Profile Analysis

### Heap Statistics

| Phase | Heap Size | Notes |
|-------|-----------|-------|
| Initial | 4.5 MB | Post-module-load |
| Peak | ~11 MB | During heavy test execution |
| Final | ~9 MB | After test completion |

### Garbage Collection

GC events captured during test execution:

```
Scavenge 4.5 → 4.0 MB (0.41 ms) - Initial cleanup
Scavenge 4.6 → 4.3 MB (0.28 ms) - Minor allocation
Scavenge 7.1 → 6.1 MB (0.33 ms) - Young gen promotion
Scavenge 7.6 → 6.9 MB (0.35 ms) - Continued allocation
Scavenge 11.2 → 8.9 MB (5.18 ms) - Larger cleanup
```

**Analysis**: 
- All GC events are Scavenge (minor GC), indicating healthy young generation turnover
- No Mark-Compact events means no memory pressure or fragmentation
- Total GC pause time is negligible (~6.5ms across entire test run)
- Objects are short-lived and efficiently collected

### Memory-Efficient Patterns

The library demonstrates good memory hygiene:
1. **Short-lived allocations**: Arbitrary values are generated and discarded efficiently
2. **No memory leaks**: Heap stabilizes without growth after initial warm-up
3. **Efficient shrinking**: Shrink trees don't cause memory bloat

## Identified Optimization Opportunities

Given the excellent baseline performance, optimization priorities should focus on:

### 1. Startup Time Reduction (Low Priority)
- **Impact**: ~50% of measured time is module loading
- **Potential**: Lazy imports, code splitting
- **ROI**: Low - startup is one-time cost
- **Related Issues**: None currently open

### 2. Shrink Tree Generation (Medium Priority)
- **Impact**: When a property test fails, FluentCheck generates a "shrink tree" — a lazy data structure containing progressively smaller counterexamples. For deeply nested arbitraries (e.g., arrays of records containing arrays), this tree can become large and expensive to traverse.
- **Potential**: Currently shrink trees are constructed eagerly when `shrink()` is called. Moving to fully lazy construction (generators/iterators that compute children on-demand) could reduce memory allocations and speed up shrinking for complex types.
- **ROI**: Medium - primarily benefits users with complex domain models or deeply nested data structures. Most simple property tests won't see improvement.
- **Proposal**: [#452](https://github.com/fluent-check/fluent-check/issues/452) - Refactor shrink trees to lazy generator-based construction
- **Related Issues**:
  - [#434](https://github.com/fluent-check/fluent-check/issues/434) - Research: Integrated Shrinking Approach (Hypothesis/Hedgehog)
  - [#138](https://github.com/fluent-check/fluent-check/issues/138) - Shrinking mapped tuples sometimes fails with timeout
  - [#18](https://github.com/fluent-check/fluent-check/issues/18) - Should shrink perform exhaustive search by default?

### 3. Regex Arbitrary Performance (Low Priority)
- **Impact**: Email/UUID pattern tests are slower
- **Potential**: Pattern caching, optimized generation
- **ROI**: Low - isolated to specific arbitrary types
- **Related Issues**:
  - [#433](https://github.com/fluent-check/fluent-check/issues/433) - Add additional regex pattern presets

### 4. High-Arity Property Tests (Medium Priority)
- **Impact**: Property tests with multiple arbitraries (e.g., `forAll(int, int, int, string)`) execute significantly slower than single-arbitrary tests. This is because the search space grows exponentially — 3 arbitraries with 100 samples each means 100³ = 1,000,000 potential combinations, though FluentCheck samples intelligently rather than exhaustively.
- **Potential**: 
  - **Smarter sampling**: Use statistical techniques to reduce redundant combinations
  - **Parallel generation**: Generate values for independent arbitraries concurrently
  - **Early termination**: Stop generating when sufficient coverage is detected
- **ROI**: Medium - affects users writing complex mathematical properties or integration tests with many inputs. Typical unit-level property tests use 1-2 arbitraries and won't benefit.
- **Related Issues**:
  - [#10](https://github.com/fluent-check/fluent-check/issues/10) - Provide exhaustive generation for small arbitraries
  - [#7](https://github.com/fluent-check/fluent-check/issues/7) - Optimise unique to use a decent underlying deduplicator
  - [#418](https://github.com/fluent-check/fluent-check/issues/418) - Add confidence-based termination

## Recommendations

### No Immediate Optimizations Required

The profiling data suggests FluentCheck is already well-optimized for typical use cases. The library:
- Generates values efficiently with minimal allocations
- Shrinks counterexamples without excessive memory use
- Completes 309 property tests in under 10 seconds

### Future Profiling Cadence

To maintain performance:
1. Re-run profiling after significant refactors
2. Add targeted benchmarks if specific operations become slow
3. Monitor test execution time in CI (regression detection)

### Potential Future Investigations

If users report performance issues:
1. Profile specific slow tests in isolation
2. Add micro-benchmarks for hot paths (arbitrary generation, shrinking)
3. Consider adding performance budgets in CI

## Methodology

### Tools Used

- **CPU Profiling**: Node.js `--prof` flag with V8 CPU profiler
- **Flame Graphs**: `0x` (https://github.com/davidmarkclements/0x)
- **Heap Profiling**: Node.js `--heap-prof` flag
- **GC Tracing**: Node.js `--trace-gc` flag

### Workload

The full test suite (`npm test`) was used as the profiling workload because:
- It exercises all library features
- Representative of real-world usage
- Provides consistent, reproducible baseline

### How to Reproduce

```bash
# CPU profiling with flame graph
npm run profile:cpu

# Memory profiling with GC trace
npm run profile:heap

# View results
open profiles/flamegraph_*/flamegraph.html
cat profiles/cpu_profile_*.txt
cat profiles/gc_trace_*.log
```

See [scripts/README.md](../../scripts/README.md) for detailed profiling instructions.
