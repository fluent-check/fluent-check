import type {StatisticsAggregationInput} from '../statisticsAggregator.js'
import type {ExplorationResult} from '../strategies/Explorer.js'
import type {ShrinkResult} from '../strategies/Shrinker.js'
import type {ExecutionTimeBreakdown} from './ExecutionTiming.js'
import type {ShrinkingStatistics} from '../statistics.js'

export interface StatisticsInputParams {
  readonly explorationResult: ExplorationResult<{}>
  readonly timeBreakdown: ExecutionTimeBreakdown
  readonly counterexampleFound: boolean
  readonly shrinkingStats?: ShrinkingStatistics
}

/**
 * Build a StatisticsAggregationInput from exploration results and timing.
 *
 * This centralizes the repeated spreading pattern that was in 4 places.
 */
export function buildStatisticsInput(params: StatisticsInputParams): StatisticsAggregationInput {
  const {explorationResult, timeBreakdown, counterexampleFound, shrinkingStats} = params

  return {
    testsRun: explorationResult.testsRun,
    skipped: explorationResult.skipped,
    executionTimeMs: timeBreakdown.exploration + timeBreakdown.shrinking,
    counterexampleFound,
    executionTimeBreakdown: timeBreakdown,
    ...(explorationResult.labels !== undefined && {labels: explorationResult.labels}),
    ...(explorationResult.detailedStats !== undefined && {detailedStats: explorationResult.detailedStats}),
    ...(shrinkingStats !== undefined && {shrinkingStats})
  }
}

/**
 * Build ShrinkingStatistics from a ShrinkResult.
 */
export function toShrinkingStatistics(result: ShrinkResult<{}>): ShrinkingStatistics {
  return {
    candidatesTested: result.attempts,
    roundsCompleted: result.roundsCompleted ?? result.rounds,
    improvementsMade: result.rounds
  }
}
