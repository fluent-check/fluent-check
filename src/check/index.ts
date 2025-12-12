export type {
  CheckExecutionContext,
  ExecutionLogger,
  SeededRandomGenerator
} from './CheckExecutionContext.js'

export type {
  CheckOutcome,
  ForallPassOutcome,
  ExistsPassOutcome,
  ExhaustedOutcome,
  FailedOutcome
} from './CheckOutcome.js'

export type {
  ExecutionTimeBreakdown,
  TimedResult
} from './ExecutionTiming.js'
export {withTiming} from './ExecutionTiming.js'

export type {StatisticsInputParams} from './buildStatisticsInput.js'
export {buildStatisticsInput, toShrinkingStatistics} from './buildStatisticsInput.js'

export {extractExistentialWitness} from './extractExistentialWitness.js'

export {unwrapBoundTestCase} from './unwrapBoundTestCase.js'
