# Tasks: Profile Performance Hotspots

## 1. Setup Profiling Infrastructure

- [ ] 1.1 Install profiling dependencies (`0x`, `clinic`, or configure built-in Node profiler)
- [ ] 1.2 Create `scripts/profile-cpu.sh` to run tests with V8 CPU profiler (`--prof`)
- [ ] 1.3 Create `scripts/profile-heap.sh` to run tests with heap profiling (`--heap-prof`)
- [ ] 1.4 Add npm scripts: `npm run profile:cpu` and `npm run profile:heap`
- [ ] 1.5 Document profiling setup in `scripts/README.md`

## 2. CPU Profiling Analysis

- [ ] 2.1 Run CPU profiler against full test suite
- [ ] 2.2 Process V8 logs with `node --prof-process` or `0x`
- [ ] 2.3 Generate flame graph visualization
- [ ] 2.4 Identify top 10 functions by self-time
- [ ] 2.5 Categorize hotspots (arbitrary generation, shrinking, type operations, etc.)
- [ ] 2.6 Document CPU findings in `docs/performance/cpu-profile.md`

## 3. Memory Profiling Analysis

- [ ] 3.1 Run heap profiler against full test suite
- [ ] 3.2 Analyze allocation patterns and object lifetimes
- [ ] 3.3 Identify top 10 allocation sites by bytes
- [ ] 3.4 Check for memory leaks or excessive retention
- [ ] 3.5 Measure GC pressure using `--trace-gc` flags
- [ ] 3.6 Document memory findings in `docs/performance/memory-profile.md`

## 4. Targeted Component Analysis

- [ ] 4.1 Profile `ArbitraryInteger` and `ArbitraryReal` generation
- [ ] 4.2 Profile `ArbitraryArray` with various sizes
- [ ] 4.3 Profile string arbitraries (`string`, `regex`)
- [ ] 4.4 Profile shrinking algorithms (identify shrink tree overhead)
- [ ] 4.5 Profile `FluentStrategy` iteration and state management
- [ ] 4.6 Profile composite arbitraries (`map`, `filter`, `chain`)

## 5. Baseline Report

- [ ] 5.1 Create `docs/performance/baseline-report.md` summarizing all findings
- [ ] 5.2 Document test suite execution time breakdown
- [ ] 5.3 Rank optimization opportunities by potential impact
- [ ] 5.4 Draft recommended optimization proposals (for future work)
- [ ] 5.5 Add before/after measurement methodology for tracking improvements

## 6. Cleanup and Documentation

- [ ] 6.1 Ensure profiling scripts are cross-platform or documented as Unix-only
- [ ] 6.2 Add `.gitignore` entries for profiling artifacts (`*.cpuprofile`, `*.heapprofile`, etc.)
- [ ] 6.3 Update `CONTRIBUTING.md` with profiling instructions for contributors
