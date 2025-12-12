# Tasks: Add Detailed Statistics and Enhanced Reporting

## Phase 1: Core Types and Interfaces

- [x] 1.1 Define `Verbosity` enum in `src/types.ts` or `src/Verbosity.ts`
  - Levels: `Quiet = 0`, `Normal = 1`, `Verbose = 2`, `Debug = 3`
- [x] 1.2 Define `ArbitraryStatistics` interface in `src/statistics.ts`
  - Include `samplesGenerated`, `uniqueValues`, `cornerCases`, `distribution`, `arrayLengths`, `stringLengths`
- [x] 1.3 Define `DistributionStatistics` interface (min, max, mean, median, q1, q3, stdDev, count)
- [x] 1.4 Define `LengthStatistics` interface (min, max, mean, median, count)
- [x] 1.5 Define `TargetStatistics` interface (best, observations, mean)
- [x] 1.6 Extend `FluentStatistics` interface with optional fields:
  - `arbitraryStats?: Record<string, ArbitraryStatistics>`
  - `events?: Record<string, number>`
  - `eventPercentages?: Record<string, number>`
  - `targets?: Record<string, TargetStatistics>`
  - `shrinking?: ShrinkingStatistics`

## Phase 2: Streaming Statistics Algorithms

- [x] 2.1 Implement `StreamingMeanVariance` class using Welford's algorithm
  - Methods: `add(value)`, `getMean()`, `getVariance()`, `getStdDev()`, `getCount()`
  - O(1) memory, numerically stable
- [x] 2.2 Implement `StreamingQuantiles` class
  - Use P² algorithm or similar for O(k) memory quantile estimation
  - Methods: `add(value)`, `getQuantile(p)`, `getMedian()`, `getQ1()`, `getQ3()`
  - For n <= 100, store all values and compute exact quantiles
- [x] 2.3 Implement `StreamingMinMax` class
  - Track min/max with O(1) updates
- [x] 2.4 Create `DistributionTracker` facade combining all streaming algorithms
  - Single `add(value)` method updates all trackers
  - `getStatistics()` returns complete `DistributionStatistics`
- [x] 2.5 Test streaming algorithms for accuracy
  - Verify Welford's algorithm against naive implementation
  - Verify quantile estimates within specified accuracy bounds

## Phase 3: Statistics Context and Collection

- [x] 3.1 Create `StatisticsContext` class in `src/statistics.ts`
  - Holds per-quantifier `ArbitraryStatisticsCollector` instances
  - Holds event counts (Map<string, Set<number>> for per-test-case dedup)
  - Holds target observations (Map<string, DistributionTracker>)
- [x] 3.2 Create `ArbitraryStatisticsCollector` class
  - Uses `DistributionTracker` for numeric values
  - Uses hash-based Set for uniqueness tracking
  - Tracks corner case hits
- [x] 3.3 Implement `fc.event(name, payload?)` global function
  - Accesses current `StatisticsContext` via async local storage or similar
  - Throws helpful error if called outside property evaluation
- [x] 3.4 Implement `fc.target(observation, label?)` global function
  - Validates observation is finite (not NaN, not Infinity)
  - Accesses current `StatisticsContext`
  - Throws helpful error if called outside property evaluation
- [x] 3.5 Add async local storage or context propagation mechanism
  - Enable `fc.event()` and `fc.target()` to access current context

## Phase 4: Strategy Factory Extensions

- [x] 4.1 Add `detailedStatistics: boolean` field to `FluentStrategyFactory`
- [x] 4.2 Add `verbosity: Verbosity` field to `FluentStrategyFactory`
- [x] 4.3 Implement `withDetailedStatistics(): this` method
- [x] 4.4 Implement `withVerbosity(level: Verbosity): this` method
- [x] 4.5 Pass configuration to built strategy
- [x] 4.6 Update `defaultStrategy()` to NOT enable detailed statistics
- [x] 4.7 Consider adding `debugStrategy()` preset with detailed stats + Debug verbosity

## Phase 5: Explorer Statistics Integration

- [x] 5.1 Add optional `statisticsContext` parameter to `Explorer.explore()`
- [x] 5.2 Extend `AbstractExplorer` with statistics collection hooks
  - `onSample(quantifierName, value, arbitrary)` - called when sampling
  - `onEvaluate(testCase)` - called before property evaluation
  - `onResult(testCase, passed)` - called after property evaluation
- [x] 5.3 Track samples generated per quantifier during traversal
- [x] 5.4 Track unique values using arbitrary's `hashCode()`/`equals()` or structural equality
- [x] 5.5 Track corner cases tested by comparing against `arbitrary.cornerCases()`
- [x] 5.6 Collect distribution data for numeric arbitraries
- [x] 5.7 Collect array/string length statistics for collection arbitraries
- [x] 5.8 Extend `ExplorationResult` with optional `detailedStats` field

## Phase 6: FluentCheck Statistics Aggregation

- [x] 6.1 Accept statistics configuration from strategy
- [x] 6.2 Create `StatisticsContext` if detailed statistics enabled
- [x] 6.3 Pass context to Explorer
- [x] 6.4 Aggregate statistics from `ExplorationResult.detailedStats`
- [x] 6.5 Calculate final percentages for events
- [x] 6.6 Finalize distribution statistics (call `getStatistics()` on trackers)
- [x] 6.7 Include aggregated statistics in `FluentStatistics`
- [x] 6.8 Handle empty test runs gracefully (empty object, no errors)
- [x] 6.9 Handle shrinking statistics (track separately from exploration)

## Phase 7: Reporter Enhancements

- [x] 7.1 Add `formatStatistics(statistics, options?)` static method to `FluentReporter`
- [x] 7.2 Implement text format output
  - Human-readable terminal output
  - Aligned columns for tables
- [x] 7.3 Implement markdown format output
  - GitHub-flavored markdown tables
  - Headers for sections
- [x] 7.4 Implement JSON format output
  - Valid parseable JSON
  - All statistics fields included
- [x] 7.5 Implement histogram generation for distributions
  - ASCII bar charts using block characters
  - Configurable bin count
- [x] 7.6 Implement label truncation (top N by count, with "... and M more")
- [x] 7.7 Update error message to include seed with reproduction hint
- [x] 7.8 Update error message structure (headline, counterexample, seed, stats, shrink info)

## Phase 8: Verbosity Implementation

- [x] 8.1 Implement Quiet mode (no console output)
- [x] 8.2 Implement Normal mode (counterexamples and coverage failures only)
- [x] 8.3 Implement Verbose mode
  - Progress updates (configurable interval)
  - Final statistics summary
  - Label/event/target tables
- [x] 8.4 Implement Debug mode
  - All Verbose output
  - Per-arbitrary sampling details
  - Shrinking progress
  - RNG seed
- [x] 8.5 Thread verbosity through execution pipeline
- [x] 8.6 Respect verbosity in all output points

## Phase 9: Check Options

- [x] 9.1 Add `logStatistics?: boolean` option to `.check()` method
- [x] 9.2 Add `verbose?: boolean` shortcut option (sets Verbosity.Verbose)
- [x] 9.3 Add `onProgress?: (progress: ProgressInfo) => void` callback option
- [x] 9.4 Add `progressInterval?: number` option (default: 100 tests or 1000ms)
- [x] 9.5 Add `logger?: Logger` option for custom logging
- [x] 9.6 Implement `ProgressInfo` type with testsRun, totalTests, percentComplete, etc.
- [x] 9.7 Implement progress callback invocation with error handling
- [x] 9.8 Implement statistics logging at end of test

## Phase 10: Testing

- [x] 10.1 Test arbitrary statistics collection for integer arbitraries
- [x] 10.2 Test arbitrary statistics collection for array arbitraries
- [x] 10.3 Test arbitrary statistics collection for string arbitraries
- [x] 10.4 Test arbitrary statistics collection for composed arbitraries (map, filter)
- [x] 10.5 Test streaming quantile accuracy (compare to exact for small samples)
- [x] 10.6 Test streaming quantile memory bounds
- [x] 10.7 Test Welford's algorithm numerical stability
- [x] 10.8 Test event tracking (single event, multiple events, deduplication)
- [x] 10.9 Test target tracking (single target, multiple labels, invalid observations)
- [x] 10.10 Test statistics aggregation with multiple quantifiers
- [x] 10.11 Test statistics with nested quantifiers (forall inside exists)
- [x] 10.12 Test statistics with given predicates (filtering)
- [x] 10.13 Test each verbosity level output
- [x] 10.14 Test formatStatistics for each format (text, markdown, json)
- [x] 10.15 Test histogram generation (deferred - not yet implemented)
- [x] 10.16 Test progress callbacks
- [x] 10.17 Test performance overhead (should be < 20%)
- [x] 10.18 Test that statistics are undefined when disabled
- [x] 10.19 Test backward compatibility (existing code unchanged)
- [x] 10.20 Test error scenarios (event/target outside property, invalid target value)

## Phase 11: Documentation

- [x] 11.1 Document `ArbitraryStatistics` interface and all sub-interfaces
- [x] 11.2 Document `Verbosity` enum and usage patterns
- [x] 11.3 Document `withDetailedStatistics()` method
- [x] 11.4 Document `withVerbosity()` method
- [x] 11.5 Document `fc.event()` function with examples
- [x] 11.6 Document `fc.target()` function with examples
- [x] 11.7 Document `formatStatistics()` method and options
- [x] 11.8 Document progress callbacks and `onProgress` option
- [x] 11.9 Add usage examples for detailed statistics
- [x] 11.10 Add examples of different verbosity levels
- [x] 11.11 Document performance implications and when to enable detailed statistics
- [x] 11.12 Document histogram interpretation

## Phase 12: Follow-ups from review

- [x] 12.1 Ensure `logStatistics` respects `Verbosity.Quiet` (no output in Quiet mode)
- [x] 12.2 Implement histogram generation and honor `includeHistograms` in text/markdown formatting
- [x] 12.3 Update streaming quantile estimator to meet stated accuracy bounds (use P² or calibrated reservoir)
- [x] 12.4 Log warnings for invalid `fc.target` observations per verbosity rules
- [x] 12.5 Support event payloads in debug-level output
- [x] 12.6 Add `logger` option to `.check()` and route all output through it

## Notes

- Events and targets work independently of `withDetailedStatistics()` - they are always tracked when used
- Detailed statistics (arbitraryStats) require `withDetailedStatistics()` to be enabled
- The 5-15% performance overhead target is aspirational; 20% is acceptable upper bound
- Use Welford's algorithm for numerical stability in mean/variance calculations
- Use arbitrary's `hashCode()`/`equals()` for uniqueness where available
- For large samples (n > 100), use streaming quantile estimation; for small samples, compute exact
