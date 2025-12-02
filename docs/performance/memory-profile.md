# Memory Profile Analysis

This document provides detailed analysis of memory profiling results for FluentCheck.

## Heap Profile Summary

Profiled with Node.js `--heap-prof` flag during full test suite execution (309 tests).

### Key Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Initial heap | 4.5 MB | Compact startup |
| Peak heap | ~11.2 MB | Reasonable peak |
| Final heap | ~8.9 MB | Good cleanup |
| Heap growth | +4.4 MB | Expected for test run |

## Garbage Collection Analysis

### GC Event Summary

| Type | Count | Total Time | Assessment |
|------|-------|------------|------------|
| Scavenge (minor GC) | 5 | ~6.5 ms | Healthy |
| Mark-Compact (major GC) | 0 | 0 ms | Excellent |

### GC Event Details

```
[22ms]  Scavenge 4.5 → 4.0 MB (0.41 ms) - Initial cleanup
[25ms]  Scavenge 4.6 → 4.3 MB (0.28 ms) - Module loading allocations
[42ms]  Scavenge 7.1 → 6.1 MB (0.33 ms) - Test execution begins
[51ms]  Scavenge 7.6 → 6.9 MB (0.35 ms) - Continued test execution
[169ms] Scavenge 11.2 → 8.9 MB (5.18 ms) - Peak allocation cleanup
```

### Interpretation

1. **Healthy Young Generation**: All GC events are Scavenge (minor GC), indicating objects are short-lived and efficiently collected from the young generation.

2. **No Memory Pressure**: Zero Mark-Compact (major GC) events means the old generation isn't filling up and there's no memory fragmentation.

3. **Efficient Allocation Patterns**: The average Scavenge time of ~1.3ms is negligible and doesn't impact test execution.

4. **Peak Management**: The largest Scavenge (5.18ms at 169ms) handled a 2.3MB cleanup without triggering a full GC.

## Memory Allocation Patterns

### Expected Allocations

Based on library architecture, these allocation patterns are expected:

1. **Arbitrary Values**
   - Generated values (integers, strings, arrays)
   - Short-lived, discarded after property evaluation
   - Efficiently collected by Scavenge

2. **Shrink Trees**
   - Lazy stream structures for shrinking
   - Created on-demand during counterexample search
   - Garbage collected after test completion

3. **Strategy State**
   - Configuration objects
   - Sample collections
   - Statistical accumulators

### Potential Memory Hotspots (Not Observed)

The following potential issues were NOT observed:
- ❌ Memory leaks (heap would grow unbounded)
- ❌ Object retention (Mark-Compact would trigger)
- ❌ Large array allocations (would cause GC spikes)
- ❌ String concatenation storms (common JS issue)

## Heap Snapshot Analysis

For detailed object-level analysis, load the heap profile in Chrome DevTools:

1. Open Chrome/Chromium
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"
4. Go to **Memory** tab
5. Click **Load** and select `profiles/heap_profile_*.heapprofile`

### What to Look For

| View | Purpose |
|------|---------|
| Summary | Object count by constructor |
| Comparison | Diff between snapshots |
| Containment | Object reference hierarchy |
| Retainers | What's keeping objects alive |

### Common Object Types

In a healthy FluentCheck profile, expect to see:
- `Array` - Test values and samples
- `Object` - Configuration and state
- `String` - Generated string values
- `Function` - Closures for mapping/filtering

## Recommendations

### For Library Maintainers

1. **Current state is excellent** - No memory issues detected
2. **Avoid these patterns**:
   - Global mutable state
   - Unbounded caches
   - Synchronous recursive structures
3. **Consider lazy evaluation** for shrink trees (already implemented)

### For Users

1. **Default settings are safe** - No special memory configuration needed
2. **Large arrays/strings** may increase peak memory temporarily
3. **Shrinking is memory-efficient** - Don't avoid it for memory concerns

## Profiling Commands

```bash
# Generate heap profile
npm run profile:heap -- --heap-only

# Generate GC trace
npm run profile:heap -- --gc-only

# Full profiling
npm run profile:heap

# View results
cat profiles/gc_trace_*.log
```

## Historical Baseline

| Metric | Baseline | Warning Threshold |
|--------|----------|-------------------|
| Peak heap | 11.2 MB | >50 MB |
| Scavenge count | 5 | >20 |
| Mark-Compact count | 0 | >2 |
| Longest GC pause | 5.18 ms | >50 ms |

If future profiles exceed warning thresholds, investigate:
1. Object retention preventing garbage collection
2. Large allocations in new code
3. Increased test complexity or count
