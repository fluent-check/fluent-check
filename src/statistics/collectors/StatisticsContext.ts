import {AsyncLocalStorage} from 'node:async_hooks'
import type {ArbitraryStatistics, TargetStatistics, Verbosity, LogLevel, LogEntry, Logger} from '../types.js'
import {Verbosity as VerbosityEnum} from '../types.js'
import {ArbitraryStatisticsCollector} from './ArbitraryStatisticsCollector.js'
import {DistributionTracker} from '../streaming/DistributionTracker.js'

/**
 * Context for collecting detailed statistics during test execution.
 */
export class StatisticsContext {
  constructor(
    private readonly options: {
      verbosity?: Verbosity
      logger?: Logger
    } = {}
  ) {}

  private readonly arbitraryCollectors = new Map<string, ArbitraryStatisticsCollector>()
  private readonly eventCounts = new Map<string, Set<number>>() // Set of test case indices per event
  private readonly targetTrackers = new Map<string, DistributionTracker>()
  private currentTestCaseIndex = 0

  /**
   * Get or create a collector for a quantifier.
   */
  getCollector(quantifierName: string): ArbitraryStatisticsCollector {
    let collector = this.arbitraryCollectors.get(quantifierName)
    if (collector === undefined) {
      collector = new ArbitraryStatisticsCollector()
      this.arbitraryCollectors.set(quantifierName, collector)
    }
    return collector
  }

  /**
   * Record an event for the current test case.
   */
  recordEvent(name: string, testCaseIndex: number, payload?: unknown): void {
    let testCases = this.eventCounts.get(name)
    if (testCases === undefined) {
      testCases = new Set<number>()
      this.eventCounts.set(name, testCases)
    }
    testCases.add(testCaseIndex)

    if (this.shouldLog(VerbosityEnum.Debug)) {
      this.log('debug', 'event', {name, payload, testCaseIndex})
    }
  }

  /**
   * Record a target observation.
   */
  recordTarget(label: string, observation: number): void {
    let tracker = this.targetTrackers.get(label)
    if (tracker === undefined) {
      tracker = new DistributionTracker()
      this.targetTrackers.set(label, tracker)
    }
    tracker.add(observation)
  }

  /**
   * Set the current test case index (for event deduplication).
   */
  setTestCaseIndex(index: number): void {
    this.currentTestCaseIndex = index
  }

  /**
   * Get the current test case index.
   */
  getTestCaseIndex(): number {
    return this.currentTestCaseIndex
  }

  /**
   * Log an invalid target observation when verbosity allows it.
   */
  logInvalidTarget(label: string, observation: number): void {
    if (!this.shouldLog(VerbosityEnum.Normal)) return
    this.log('warn', 'Invalid target observation ignored', {label, observation})
  }

  /**
   * Get event counts (number of test cases with each event).
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const [name, testCases] of this.eventCounts.entries()) {
      counts[name] = testCases.size
    }
    return counts
  }

  /**
   * Get target statistics.
   */
  getTargetStatistics(): Record<string, TargetStatistics> {
    const stats: Record<string, TargetStatistics> = {}
    for (const [label, tracker] of this.targetTrackers.entries()) {
      const distStats = tracker.getStatistics()
      stats[label] = {
        best: distStats.max,
        observations: distStats.count,
        mean: distStats.mean
      }
    }
    return stats
  }

  /**
   * Get all arbitrary statistics.
   * Returns empty object if no collectors exist (when detailed statistics disabled).
   */
  getArbitraryStatistics(): Record<string, ArbitraryStatistics> {
    const stats: Record<string, ArbitraryStatistics> = {}
    for (const [name, collector] of this.arbitraryCollectors.entries()) {
      stats[name] = collector.getStatistics()
    }
    return stats
  }

  /**
   * Reset the context.
   */
  reset(): void {
    this.arbitraryCollectors.clear()
    this.eventCounts.clear()
    this.targetTrackers.clear()
    this.currentTestCaseIndex = 0
  }

  private shouldLog(requiredVerbosity: Verbosity): boolean {
    const verbosity = this.options.verbosity ?? VerbosityEnum.Normal
    return verbosity >= requiredVerbosity && verbosity !== VerbosityEnum.Quiet
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level === 'debug' ? VerbosityEnum.Debug : VerbosityEnum.Normal)) return
    const entry: LogEntry = {level, message, ...(data !== undefined && {data})}
    if (this.options.logger !== undefined) {
      this.options.logger.log(entry)
    } else {
      // Fallback to console with minimal formatting
      const payload = data !== undefined ? JSON.stringify(data) : ''
      switch (level) {
        case 'warn':
          console.warn(message, payload)
          break
        case 'error':
          console.error(message, payload)
          break
        case 'debug':
          console.debug(`[DEBUG] ${message}`, payload)
          break
        default:
          console.log(message, payload)
      }
    }
  }
}

/**
 * Global context storage for fc.event() and fc.target() access.
 * Uses AsyncLocalStorage for context propagation in async environments.
 */
const statisticsContextStorage = new AsyncLocalStorage<StatisticsContext>()

/**
 * Get the current statistics context (for internal use).
 */
export function getCurrentStatisticsContext(): StatisticsContext | undefined {
  return statisticsContextStorage.getStore()
}

/**
 * Run a callback with a statistics context.
 */
export function runWithStatisticsContext<T>(
  context: StatisticsContext,
  callback: () => T
): T {
  return statisticsContextStorage.run(context, callback)
}
