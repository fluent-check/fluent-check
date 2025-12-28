import type {Logger} from '../statistics.js'
import type {StatisticsAggregator} from '../statisticsAggregator.js'
import type {ProgressReporter, ResultReporter} from '../reporting.js'
import type {Verbosity} from '../statistics.js'

/**
 * Progress information for progress callbacks.
 */
export interface ProgressInfo {
  /** Number of tests executed so far */
  testsRun: number
  /** Total tests planned (may be undefined for unbounded) */
  totalTests?: number
  /** Percentage complete (0-100) if totalTests is known */
  percentComplete?: number
  /** Tests passed so far */
  testsPassed: number
  /** Tests discarded so far */
  testsDiscarded: number
  /** Milliseconds since test start */
  elapsedMs: number
  /** Current phase of execution */
  currentPhase: 'exploring' | 'shrinking'
}

/**
 * Options for the check() method.
 */
export interface CheckOptions {
  /** Whether to log statistics after test completion */
  logStatistics?: boolean
  /** Shortcut to set verbosity to Verbose */
  verbose?: boolean
  /** Progress callback for long-running tests */
  onProgress?: (progress: ProgressInfo) => void
  /** Progress update interval (default: 100 tests or 1000ms) */
  progressInterval?: number
  /** Custom logger for structured output */
  logger?: Logger
  /**
   * Advanced: custom statistics aggregator.
   * Defaults to `DefaultStatisticsAggregator` when not provided.
   */
  statisticsAggregator?: StatisticsAggregator
  /**
   * Advanced: factory for customizing progress reporting.
   * If provided, this takes precedence over the built-in mapping from CheckOptions to ProgressReporter.
   */
  progressReporterFactory?: (params: {
    options: CheckOptions
    logger: Logger | undefined
    defaultFactory: (options: CheckOptions, logger?: Logger) => ProgressReporter
  }) => ProgressReporter
  /**
   * Advanced: factory for customizing result reporting.
   * If provided, this takes precedence over the built-in mapping from CheckOptions to ResultReporter.
   */
  resultReporterFactory?: (params: {
    options: CheckOptions
    effectiveVerbosity: Verbosity
    logger: Logger | undefined
    defaultFactory: (options: CheckOptions, effectiveVerbosity: Verbosity, logger?: Logger) => ResultReporter
  }) => ResultReporter
  /**
   * Seed for the random number generator.
   * If provided, this overrides the seed configured in the strategy or defaults.
   * Useful for reproducing specific test failures.
   */
  seed?: number
}
