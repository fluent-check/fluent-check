import {FluentCheck, pre, PreconditionFailure} from './FluentCheck.js'
import {FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
export {expect, FluentReporter, type FormatStatisticsOptions} from './FluentReporter.js'
export {pre, PreconditionFailure} from './FluentCheck.js'
export {event, target, type ProgressInfo, type CheckOptions} from './FluentCheck.js'
export {prop} from './FluentProperty.js'
export type {FluentProperty} from './FluentProperty.js'
export {strategies} from './strategies/presets.js'
export {props} from './props.js'
export {templates} from './templates.js'
export type {CheckableTemplate} from './templates.js'
export {
  RandomSampler,
  BiasedSampler,
  CachedSampler,
  DedupingSampler,
  type Sampler,
  type SamplerConfig
} from './strategies/Sampler.js'
export {
  createScenario,
  type Scenario,
  type ScenarioNode,
  type QuantifierNode,
  type ForallNode,
  type ExistsNode,
  type GivenNode,
  type WhenNode,
  type ThenNode
} from './Scenario.js'
export {
  NestedLoopExplorer,
  createNestedLoopExplorer,
  type Explorer,
  type ExplorationBudget,
  type ExplorationResult,
  type ExplorationPassed,
  type ExplorationFailed,
  type ExplorationExhausted,
  type BoundTestCase
} from './strategies/Explorer.js'
export {
  createExecutableScenario,
  type ExecutableScenario,
  type ExecutableQuantifier
} from './ExecutableScenario.js'
export {
  PerArbitraryShrinker,
  NoOpShrinker,
  createPerArbitraryShrinker,
  createNoOpShrinker,
  type Shrinker,
  type ShrinkBudget,
  type ShrinkResult
} from './strategies/Shrinker.js'
export {
  Verbosity,
  StreamingMeanVariance,
  StreamingMinMax,
  StreamingQuantiles,
  DistributionTracker,
  type Logger,
  type LogEntry,
  type LogLevel,
  type FluentStatistics,
  type ArbitraryStatistics,
  type DistributionStatistics,
  type LengthStatistics,
  type TargetStatistics,
  type ShrinkingStatistics
} from './statistics.js'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyFactory()
export {
  integer,
  real,
  nat,
  char,
  hex,
  base64,
  ascii,
  unicode,
  string,
  array,
  union,
  boolean,
  empty,
  constant,
  set,
  tuple,
  oneof,
  record,
  date,
  time,
  datetime,
  duration,
  timeToMilliseconds,
  regex,
  patterns,
  shrinkRegexString,
  // Presets
  positiveInt,
  negativeInt,
  nonZeroInt,
  byte,
  nonEmptyString,
  nonEmptyArray,
  pair,
  nullable,
  optional,
  ArbitrarySize,
  type Arbitrary
} from './arbitraries/index.js'
