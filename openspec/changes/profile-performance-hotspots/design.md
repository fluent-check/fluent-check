# Design: Profile Performance Hotspots

## Context

FluentCheck is a property-based testing library where performance directly impacts developer experience. Slow test execution discourages adoption and limits the number of test cases that can be practically run. Before optimizing, we need empirical data on where time and memory are actually spent.

### Stakeholders

- **Library users**: Benefit from faster test execution
- **Contributors**: Need baseline metrics to validate optimization PRs
- **Maintainers**: Require reproducible profiling for informed decisions

## Goals / Non-Goals

### Goals

1. Establish reproducible profiling methodology
2. Identify top CPU hotspots with quantified impact
3. Identify memory allocation hotspots
4. Create actionable optimization roadmap

### Non-Goals

- Implementing any optimizations (separate proposals)
- Building continuous benchmarking CI
- Comparing against other PBT libraries (e.g., fast-check)

## Decisions

### Decision 1: Use Node.js Built-in Profiler as Primary Tool

**What**: Use `node --prof` and `node --heap-prof` rather than third-party APM tools.

**Why**:
- Zero runtime dependency additions
- V8-native profiling with accurate tick sampling
- Works with TypeScript via ts-node
- Industry-standard format (can be visualized with Chrome DevTools)

**Alternatives considered**:
- `clinic.js`: Excellent UX but adds heavy devDependencies
- `perf_hooks`: More granular but requires code instrumentation
- Chrome DevTools remote debugging: Manual process, not scriptable

### Decision 2: Use 0x for Flame Graph Generation

**What**: Install `0x` as a devDependency for flame graph visualization.

**Why**:
- Lightweight (single purpose)
- Produces interactive HTML flame graphs
- Well-maintained and widely used
- Can be installed as optional/local tool

**Alternatives considered**:
- `clinic flame`: More features but larger footprint
- Manual `--prof-process` + external flamegraph tools: More steps, less integrated

### Decision 3: Profile Against Full Test Suite

**What**: Use `npm test` as the profiling workload.

**Why**:
- Representative of real-world usage
- Exercises all arbitraries, strategies, and shrinking
- No additional benchmark code to maintain
- Results directly relevant to user experience

**Alternatives considered**:
- Micro-benchmarks: More precise but less representative
- Synthetic stress tests: Useful but may miss real bottlenecks

### Decision 4: Store Profiles in Git-Ignored Directory

**What**: Generate profiles in `profiles/` directory, add to `.gitignore`.

**Why**:
- Profiles are large binary files (10-100MB)
- Not useful in version control
- Regenerated on demand

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Profiling overhead affects measurements | Use sampling profiler (low overhead), document overhead |
| Results vary across machines | Document hardware specs, focus on relative percentages |
| TypeScript source maps complicate analysis | Use `--enable-source-maps` flag, verify mapping |
| Test suite changes invalidate baseline | Re-profile after significant test changes |

## Profiling Commands Reference

### CPU Profiling (Built-in)

```bash
# Generate V8 profile
node --prof --enable-source-maps ./node_modules/.bin/mocha

# Process profile
node --prof-process isolate-*.log > cpu-profile.txt
```

### CPU Profiling (0x)

```bash
# Install 0x
npm install --save-dev 0x

# Generate flame graph
npx 0x -- node ./node_modules/.bin/mocha
```

### Heap Profiling

```bash
# Generate heap profile
node --heap-prof --enable-source-maps ./node_modules/.bin/mocha

# Analyze with Chrome DevTools or heapprofile tools
```

### GC Tracing

```bash
# Trace GC events
node --trace-gc ./node_modules/.bin/mocha 2>&1 | tee gc-trace.log
```

## Expected Hotspot Categories

Based on library architecture, likely hotspots include:

1. **Random number generation**: Core of all arbitraries
2. **Array/string allocation**: High-volume in array/string arbitraries
3. **Shrink tree construction**: Recursive data structure building
4. **Type operations**: TypeScript runtime overhead (if any)
5. **Statistical calculations**: jstat usage in confidence calculations
6. **Iterator/generator overhead**: Strategy iteration patterns

## Migration Plan

Not applicable - this is additive tooling with no breaking changes.

## Open Questions

1. Should we commit flame graph HTML files for documentation purposes?
2. What hardware specifications should be documented for baseline comparability?
3. Should we establish a performance budget (e.g., "test suite must complete in < X seconds")?
