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

export type {ProgressInfo, CheckOptions} from './CheckOptions.js'

export type {ExecutionConfig} from './runCheck.js'
export {
  prepareCheckExecution,
  runExploration,
  emitFinalProgress,
  resolveOutcome,
  buildResult,
  buildPropertyFunction,
  runCheck
} from './runCheck.js'

export {PreconditionFailure, pre} from './preconditions.js'
