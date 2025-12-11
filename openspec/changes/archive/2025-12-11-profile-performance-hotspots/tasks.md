# Tasks: Profile Performance Hotspots

## 1. Setup Profiling Infrastructure

- [x] 1.1 Install profiling dependencies (`0x`, `clinic`, or configure built-in Node profiler)
- [x] 1.2 Create `scripts/profile-cpu.sh` to run tests with V8 CPU profiler (`--prof`)
- [x] 1.3 Create `scripts/profile-heap.sh` to run tests with heap profiling (`--heap-prof`)
- [x] 1.4 Add npm scripts: `npm run profile:cpu` and `npm run profile:heap`
- [x] 1.5 Document profiling setup in `scripts/README.md`

## 2. CPU Profiling Analysis

- [x] 2.1 Run CPU profiler against full test suite
- [x] 2.2 Process V8 logs with `node --prof-process` or `0x`
- [x] 2.3 Generate flame graph visualization
- [x] 2.4 Identify top 10 functions by self-time
- [x] 2.5 Categorize hotspots (arbitrary generation, shrinking, type operations, etc.)
- [x] 2.6 Document CPU findings in `docs/performance/cpu-profile.md`

## 3. Memory Profiling Analysis

- [x] 3.1 Run heap profiler against full test suite
- [x] 3.2 Analyze allocation patterns and object lifetimes
- [x] 3.3 Identify top 10 allocation sites by bytes
- [x] 3.4 Check for memory leaks or excessive retention
- [x] 3.5 Measure GC pressure using `--trace-gc` flags
- [x] 3.6 Document memory findings in `docs/performance/memory-profile.md`

## 4. Targeted Component Analysis

- [x] 4.1 Profile `ArbitraryInteger` and `ArbitraryReal` generation
- [x] 4.2 Profile `ArbitraryArray` with various sizes
- [x] 4.3 Profile string arbitraries (`string`, `regex`)
- [x] 4.4 Profile shrinking algorithms (identify shrink tree overhead)
- [x] 4.5 Profile `FluentStrategy` iteration and state management
- [x] 4.6 Profile composite arbitraries (`map`, `filter`, `chain`)

## 5. Baseline Report

- [x] 5.1 Create `docs/performance/baseline-report.md` summarizing all findings
- [x] 5.2 Document test suite execution time breakdown
- [x] 5.3 Rank optimization opportunities by potential impact
- [x] 5.4 Draft recommended optimization proposals (for future work)
- [x] 5.5 Add before/after measurement methodology for tracking improvements

## 6. Cleanup and Documentation

- [x] 6.1 Ensure profiling scripts are cross-platform or documented as Unix-only
- [x] 6.2 Add `.gitignore` entries for profiling artifacts (`*.cpuprofile`, `*.heapprofile`, etc.)
- [x] 6.3 Update `CONTRIBUTING.md` with profiling instructions for contributors
