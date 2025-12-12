import type {Scenario} from '../Scenario.js'
import type {ExecutableScenario} from '../ExecutableScenario.js'
import type {Explorer, ExplorationBudget} from '../strategies/Explorer.js'
import type {Shrinker, ShrinkBudget} from '../strategies/Shrinker.js'
import type {Sampler} from '../strategies/Sampler.js'
import type {StatisticsContext, Verbosity, Logger} from '../statistics.js'
import type {StatisticsAggregator} from '../statisticsAggregator.js'
import type {ProgressReporter, ResultReporter} from '../reporting.js'
import type {CheckOptions} from '../FluentCheck.js'

/**
 * Execution logging facade.
 * Wraps verbosity-gated logging without exposing level checks to callers.
 */
export interface ExecutionLogger {
  verbose(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  readonly logger: Logger | undefined
}

/**
 * Random generator with seed tracking.
 */
export interface SeededRandomGenerator {
  readonly generator: () => number
  readonly seed?: number
}

/**
 * Complete execution context for a check() invocation.
 *
 * This replaces the anonymous object returned by #prepareCheckExecution,
 * providing named types for IDE navigation and documentation.
 */
export interface CheckExecutionContext<Rec extends {}> {
  // Scenario representation
  readonly scenario: Scenario<Rec>
  readonly executableScenario: ExecutableScenario<Rec>

  // Strategy components (properly typed, no casts needed)
  readonly explorer: Explorer<Rec>
  readonly shrinker: Shrinker<Rec>
  readonly sampler: Sampler
  readonly randomGenerator: SeededRandomGenerator

  // Budgets
  readonly explorationBudget: ExplorationBudget
  readonly shrinkBudget: ShrinkBudget

  // Configuration flags
  readonly detailedStatisticsEnabled: boolean
  readonly verbosity: Verbosity

  // Instrumentation
  readonly logging: ExecutionLogger
  readonly statisticsContext: StatisticsContext
  readonly statisticsAggregator: StatisticsAggregator

  // Observers
  readonly progressReporter: ProgressReporter
  readonly resultReporter: ResultReporter<Rec>

  // Property under test
  readonly property: (testCase: Rec) => boolean

  // Timing (set at context creation)
  readonly startTime: number

  // Original options (for reference)
  readonly options: CheckOptions
}
