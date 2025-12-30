/**
 * @deprecated This file is maintained for backwards compatibility.
 * Import from 'src/statistics/index.js' instead for the modular version.
 *
 * This re-exports all public APIs from the new modular statistics module.
 */

// Re-export everything from the modular statistics module
export {
  // Types
  type CoverageResult,
  type LogLevel,
  type LogEntry,
  type Logger,
  type ArbitraryStatistics,
  type DistributionStatistics,
  type LengthStatistics,
  type HistogramBin,
  type TargetStatistics,
  type ShrinkingStatistics,
  type FluentStatistics,
  Verbosity,

  // Distributions
  Distribution,
  IntegerDistribution,
  BetaDistribution,
  BetaBinomialDistribution,

  // Confidence functions
  wilsonScoreInterval,
  calculateBayesianConfidence,
  calculateCredibleInterval,
  sampleSizeForConfidence,
  expectedTestsToDetectFailure,
  detectionProbability,

  // Streaming algorithms
  StreamingMeanVariance,
  StreamingMinMax,
  StreamingQuantiles,
  DistributionTracker,
  DEFAULT_QUANTILE_BUFFER_SIZE,
  DEFAULT_HISTOGRAM_SAMPLE_SIZE,
  DEFAULT_HISTOGRAM_BINS,

  // Collectors
  ArbitraryStatisticsCollector,
  StatisticsContext,
  getCurrentStatisticsContext,
  runWithStatisticsContext,

  // Utilities
  factorial
} from './statistics/index.js'
