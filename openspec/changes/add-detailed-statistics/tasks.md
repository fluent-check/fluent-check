# Tasks: Add Detailed Statistics and Enhanced Reporting

## 1. ArbitraryStatistics Interface

- [ ] 1.1 Define ArbitraryStatistics interface
- [ ] 1.2 Add samplesGenerated, uniqueValues fields
- [ ] 1.3 Add cornerCases tracking structure
- [ ] 1.4 Add distribution summary for numeric types
- [ ] 1.5 Add stringLengths/arrayLengths for respective types

## 2. Statistics Extension

- [ ] 2.1 Add `arbitraryStats?: Record<string, ArbitraryStatistics>` to FluentStatistics

## 3. Detailed Statistics Strategy

- [ ] 3.1 Add `withDetailedStatistics()` to FluentStrategyFactory
- [ ] 3.2 Enable per-arbitrary tracking when enabled
- [ ] 3.3 Track samples generated per arbitrary
- [ ] 3.4 Track unique values (use HyperLogLog for memory efficiency)

## 4. Streaming Quantile Algorithm

- [ ] 4.1 Implement P² algorithm or t-digest for streaming quantiles
- [ ] 4.2 O(1) memory, O(1) update complexity
- [ ] 4.3 Calculate min, max, mean, median, percentiles

## 5. Corner Case Tracking

- [ ] 5.1 Add corner case metadata to Arbitrary classes
- [ ] 5.2 Track which corner cases have been tested
- [ ] 5.3 Report tested vs total corner cases

## 6. Verbosity System

- [ ] 6.1 Define Verbosity enum (Quiet, Normal, Verbose, Debug)
- [ ] 6.2 Add `withVerbosity(level)` to FluentStrategyFactory
- [ ] 6.3 Implement output at each verbosity level
- [ ] 6.4 Quiet: no output
- [ ] 6.5 Normal: counterexamples only (default)
- [ ] 6.6 Verbose: progress and all test cases
- [ ] 6.7 Debug: internal debugging information

## 7. Enhanced FluentReporter

- [ ] 7.1 Add `formatStatistics(stats, options)` method
- [ ] 7.2 Support text, JSON, and markdown formats
- [ ] 7.3 Add concise and detailed modes
- [ ] 7.4 Format label distribution as table
- [ ] 7.5 Format coverage results as table
- [ ] 7.6 Format arbitrary stats when detailed

## 8. Check Options

- [ ] 8.1 Add CheckOptions interface with verbose, logStatistics, showLabels, showCoverage
- [ ] 8.2 Support verbose option in check()
- [ ] 8.3 Implement logStatistics to output after completion
- [ ] 8.4 Support custom reporter function

## 9. Testing

- [ ] 9.1 Test detailed statistics collection
- [ ] 9.2 Test streaming quantile accuracy (within 5% of true values)
- [ ] 9.3 Test corner case tracking
- [ ] 9.4 Test verbosity levels
- [ ] 9.5 Test reporter formatting
- [ ] 9.6 Test performance overhead < 15% when enabled
- [ ] 9.7 Verify existing tests continue to pass

## 10. Documentation

- [ ] 10.1 Add detailed statistics examples
- [ ] 10.2 Document verbosity levels
- [ ] 10.3 Document reporter API
- [ ] 10.4 Update API docs
- [ ] 10.5 Update CHANGELOG

## Acceptance Criteria

- [ ] Detailed stats are accurate
- [ ] Streaming quantiles within 5% of true values
- [ ] Verbosity levels control output correctly
- [ ] Reporter formats statistics clearly
- [ ] Performance overhead < 15% when enabled
