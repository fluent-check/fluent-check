import type {DetailedExplorationStats} from './strategies/Explorer.js'
import type {FluentStatistics, ShrinkingStatistics} from './statistics.js'
import {calculateBayesianConfidence, calculateCredibleInterval} from './statistics.js'

export interface StatisticsAggregationInput {
  testsRun: number
  skipped: number
  executionTimeMs: number
  counterexampleFound: boolean
  executionTimeBreakdown: { exploration: number; shrinking: number }
  labels?: Record<string, number>
  detailedStats?: DetailedExplorationStats
  shrinkingStats?: ShrinkingStatistics
  /** Pass rate threshold for confidence calculation (default 0.999) */
  passRateThreshold?: number
}

export interface StatisticsAggregator {
  aggregate(input: StatisticsAggregationInput): FluentStatistics
}

export class DefaultStatisticsAggregator implements StatisticsAggregator {
  aggregate(input: StatisticsAggregationInput): FluentStatistics {
    const {
      testsRun,
      skipped,
      executionTimeMs,
      counterexampleFound,
      executionTimeBreakdown,
      labels,
      detailedStats,
      shrinkingStats
    } = input

    const testsPassed = counterexampleFound ? testsRun - skipped - 1 : testsRun - skipped
    const testsFailed = counterexampleFound ? 1 : 0

    const stats: FluentStatistics = {
      testsRun,
      testsPassed,
      testsDiscarded: skipped,
      executionTimeMs,
      executionTimeBreakdown
    }

    // Calculate Bayesian confidence and credible interval
    // Only calculate if we have at least one test result
    if (testsRun > 0) {
      const threshold = input.passRateThreshold ?? 0.999
      stats.confidence = calculateBayesianConfidence(testsPassed, testsFailed, threshold)
      stats.credibleInterval = calculateCredibleInterval(testsPassed, testsFailed)
    }

    if (labels !== undefined) {
      stats.labels = labels
      if (testsRun > 0) {
        const labelPercentages: Record<string, number> = {}
        for (const [label, count] of Object.entries(labels)) {
          labelPercentages[label] = (count / testsRun) * 100
        }
        stats.labelPercentages = labelPercentages
      }
    }

    if (detailedStats !== undefined) {
      if (detailedStats.arbitraryStats !== undefined) {
        stats.arbitraryStats = detailedStats.arbitraryStats
      }
      if (detailedStats.events !== undefined) {
        stats.events = detailedStats.events
        if (testsRun > 0) {
          const eventPercentages: Record<string, number> = {}
          for (const [event, count] of Object.entries(detailedStats.events)) {
            eventPercentages[event] = (count / testsRun) * 100
          }
          stats.eventPercentages = eventPercentages
        }
      }
      if (detailedStats.targets !== undefined) {
        stats.targets = detailedStats.targets
      }
    }

    if (shrinkingStats !== undefined) {
      stats.shrinking = shrinkingStats
    }

    return stats
  }
}

