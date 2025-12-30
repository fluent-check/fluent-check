/**
 * Shared type definitions for statistics module.
 */

/**
 * Coverage verification result for a single coverage requirement.
 */
export interface CoverageResult {
  /** The label being verified */
  label: string
  /** The minimum required percentage (0-100) */
  requiredPercentage: number
  /** The actual observed percentage (0-100) */
  observedPercentage: number
  /** Whether the requirement was satisfied */
  satisfied: boolean
  /** Wilson score confidence interval for observed percentage */
  confidenceInterval: [number, number]
  /** The confidence level used (default 0.95) */
  confidence: number
}

/**
 * Verbosity levels for test output.
 */
export enum Verbosity {
  /** No output except thrown errors */
  Quiet = 0,
  /** Default; counterexamples and coverage failures only */
  Normal = 1,
  /** Progress updates, statistics summary, and all classifications */
  Verbose = 2,
  /** All verbose output plus internal state and generation details */
  Debug = 3
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

export interface Logger {
  log: (entry: LogEntry) => void
}

/**
 * Statistics for a single arbitrary's generated values.
 */
export interface ArbitraryStatistics {
  /**
   * Number of values generated for this arbitrary.
   * Note: This counts all samples generated during traversal, which may be
   * higher than testsRun when preconditions filter samples. For nested quantifiers,
   * this reflects the actual sampling frequency (inner quantifiers may have higher counts).
   */
  samplesGenerated: number
  /** Number of distinct values generated */
  uniqueValues: number
  /** Corner cases that were tested */
  cornerCases: {
    /** Array of corner case values that were generated */
    tested: unknown[]
    /** Total number of corner cases available for this arbitrary */
    total: number
  }
  /** Distribution statistics for numeric arbitraries (optional) */
  distribution?: DistributionStatistics
  /** Histogram bins for numeric arbitraries (optional) */
  distributionHistogram?: HistogramBin[]
  /** Array length statistics for array arbitraries (optional) */
  arrayLengths?: LengthStatistics
  /** Histogram bins for array lengths (optional) */
  arrayLengthHistogram?: HistogramBin[]
  /** String length statistics for string arbitraries (optional) */
  stringLengths?: LengthStatistics
  /** Histogram bins for string lengths (optional) */
  stringLengthHistogram?: HistogramBin[]
}

/**
 * Distribution statistics for numeric values.
 */
export interface DistributionStatistics {
  /** Minimum value generated */
  min: number
  /** Maximum value generated */
  max: number
  /** Arithmetic mean of generated values */
  mean: number
  /** Estimated median value (50th percentile) */
  median: number
  /** Estimated first quartile (25th percentile) */
  q1: number
  /** Estimated third quartile (75th percentile) */
  q3: number
  /** Sample standard deviation */
  stdDev: number
  /** Number of observations */
  count: number
}

/**
 * Length statistics for arrays or strings (subset of DistributionStatistics).
 */
export type LengthStatistics = Pick<DistributionStatistics, 'min' | 'max' | 'mean' | 'median' | 'count'>

/**
 * Histogram bin representation for formatted output.
 */
export interface HistogramBin {
  label: string
  start: number
  end: number
  count: number
  percentage: number
}

/**
 * Statistics for target observations.
 */
export interface TargetStatistics {
  /** The maximum observation value seen */
  best: number
  /** Number of observations recorded */
  observations: number
  /** Mean of all observations */
  mean: number
}

/**
 * Statistics for shrinking operations.
 */
export interface ShrinkingStatistics {
  /** Number of shrink candidates evaluated */
  candidatesTested: number
  /** Number of shrinking iterations completed */
  roundsCompleted: number
  /** Number of times a smaller counterexample was found */
  improvementsMade: number
}

/**
 * Basic execution statistics for property-based tests.
 */
export interface FluentStatistics {
  /** Total test cases executed */
  testsRun: number
  /** Test cases that passed (where the property held) */
  testsPassed: number
  /** Test cases filtered by preconditions */
  testsDiscarded: number
  /** Total execution time in milliseconds */
  executionTimeMs: number
  /** Breakdown of execution time by phase (optional) */
  executionTimeBreakdown?: {
    exploration: number
    shrinking: number
  }
  /** Label counts for test case classifications (optional) */
  labels?: Record<string, number>
  /** Label percentages (0-100) for test case classifications (optional) */
  labelPercentages?: Record<string, number>
  /** Coverage verification results (optional) */
  coverageResults?: CoverageResult[]
  /** Per-arbitrary statistics (optional, requires withDetailedStatistics()) */
  arbitraryStats?: Record<string, ArbitraryStatistics>
  /** Event counts (optional, tracked when fc.event() is used) */
  events?: Record<string, number>
  /** Event percentages (0-100) (optional, tracked when fc.event() is used) */
  eventPercentages?: Record<string, number>
  /** Target statistics (optional, tracked when fc.target() is used) */
  targets?: Record<string, TargetStatistics>
  /** Shrinking statistics (optional) */
  shrinking?: ShrinkingStatistics
  /** Bayesian confidence that property holds (0-1, optional) */
  confidence?: number
  /** 95% credible interval for true pass rate [lower, upper] (optional) */
  credibleInterval?: [number, number]
}
