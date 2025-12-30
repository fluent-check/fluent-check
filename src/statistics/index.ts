/**
 * Statistics module - comprehensive statistical analysis for property-based testing.
 *
 * This module is organized into the following submodules:
 * - distributions: Probability distributions (Beta, BetaBinomial, etc.)
 * - confidence: Confidence calculations (Wilson score, Bayesian, sample size)
 * - streaming: Streaming algorithms (mean, variance, quantiles)
 * - collectors: Statistics collection during test execution
 * - types: Shared type definitions
 */

import jstat from 'jstat'

// Re-export types
export type {
  CoverageResult,
  LogLevel,
  LogEntry,
  Logger,
  ArbitraryStatistics,
  DistributionStatistics,
  LengthStatistics,
  HistogramBin,
  TargetStatistics,
  ShrinkingStatistics,
  FluentStatistics
} from './types.js'
export {Verbosity} from './types.js'

// Re-export distributions
export {
  Distribution,
  IntegerDistribution,
  BetaDistribution,
  BetaBinomialDistribution
} from './distributions/index.js'

// Re-export confidence functions
export {
  wilsonScoreInterval,
  calculateBayesianConfidence,
  calculateCredibleInterval,
  sampleSizeForConfidence,
  expectedTestsToDetectFailure,
  detectionProbability
} from './confidence/index.js'

// Re-export streaming algorithms
export {
  StreamingMeanVariance,
  StreamingMinMax,
  StreamingQuantiles,
  DistributionTracker,
  DEFAULT_QUANTILE_BUFFER_SIZE,
  DEFAULT_HISTOGRAM_SAMPLE_SIZE,
  DEFAULT_HISTOGRAM_BINS
} from './streaming/index.js'

// Re-export collectors
export {
  ArbitraryStatisticsCollector,
  StatisticsContext,
  getCurrentStatisticsContext,
  runWithStatisticsContext
} from './collectors/index.js'

// Utility function using jstat directly
export function factorial(n: number): number {
  return jstat.factorial(n)
}
