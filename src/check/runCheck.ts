import type {Scenario, GivenNode, WhenNode, ThenNode} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {CheckOptions, ProgressInfo} from './CheckOptions.js'
import type {CheckExecutionContext, CheckOutcome} from './index.js'
import {FluentStrategyFactory} from '../strategies/FluentStrategyFactory.js'
import type {ExplorationBudget, ExplorationResult} from '../strategies/Explorer.js'
import {FluentResult} from '../FluentResult.js'
import {Verbosity, StatisticsContext as StatisticsContextClass} from '../statistics.js'
import {DefaultStatisticsAggregator} from '../statisticsAggregator.js'
import {createProgressReporter, createResultReporter, createExecutionLogger} from '../reportingConfig.js'
import {
  buildStatisticsInput,
  toShrinkingStatistics,
  extractExistentialWitness,
  unwrapBoundTestCase,
  withTiming
} from './index.js'

/**
 * Execution configuration resolved from the FluentCheck chain.
 */
export interface ExecutionConfig {
  strategyFactory?: FluentStrategyFactory
  rngBuilder?: (seed: number) => () => number
  seed?: number | undefined
}

/**
 * Prepare the execution context for a check() invocation.
 * Builds all components needed to run exploration and shrinking.
 */
export function prepareCheckExecution<Rec extends {}>(
  scenario: Scenario<Rec>,
  executionConfig: ExecutionConfig,
  options?: CheckOptions
): CheckExecutionContext<Rec> {
  const {strategyFactory, rngBuilder, seed} = executionConfig

  const factory: FluentStrategyFactory<Rec> =
    (strategyFactory as FluentStrategyFactory<Rec> | undefined) ??
    new FluentStrategyFactory<Rec>().defaultStrategy()

  // Configure RNG on the factory before building
  if (rngBuilder !== undefined) {
    factory.withRandomGenerator(rngBuilder, options?.seed ?? seed)
  } else if (options?.seed !== undefined) {
    // If no specific builder configured, use factory defaults but override seed
    factory.withRandomGenerator(factory.rngBuilder, options.seed)
  }

  // Build components from factory
  const executableScenario = createExecutableScenario(scenario)
  const explorer = factory.buildExplorer()
  const shrinker = factory.buildShrinker()
  const shrinkBudget = factory.buildShrinkBudget()
  const {sampler, randomGenerator} = factory.buildStandaloneSampler()

  const explorationBudget: ExplorationBudget = {
    maxTests: factory.configuration.sampleSize ?? 1000,
    ...(factory.configuration.targetConfidence !== undefined && {
      targetConfidence: factory.configuration.targetConfidence
    }),
    ...(factory.configuration.minConfidence !== undefined && {
      minConfidence: factory.configuration.minConfidence
    }),
    ...(factory.configuration.maxIterations !== undefined && {
      maxIterations: factory.configuration.maxIterations
    }),
    ...(factory.configuration.passRateThreshold !== undefined && {
      passRateThreshold: factory.configuration.passRateThreshold
    }),
    ...(factory.configuration.confidenceCheckInterval !== undefined && {
      confidenceCheckInterval: factory.configuration.confidenceCheckInterval
    })
  }

  // Determine detailed stats flag early for later use
  const detailedStatisticsEnabled = factory.getDetailedStatistics()

  // Build property function from scenario's then nodes
  const property = buildPropertyFunction(scenario)

  // Track execution time
  const startTime = Date.now()
  const factoryVerbosity = factory.getVerbosity()
  const checkOptions = options ?? {}

  // Handle verbose shortcut
  const verbosity = checkOptions.verbose === true ? Verbosity.Verbose : factoryVerbosity
  const logging = createExecutionLogger(verbosity, checkOptions.logger)

  logging.verbose(`Starting exploration with ${explorationBudget.maxTests} max tests...`)
  logging.debug('RNG seed', {seed: randomGenerator.seed})
  logging.debug('Strategy', {
    detailedStats: detailedStatisticsEnabled,
    verbosity: Verbosity[verbosity]
  })

  // Always pass statistics context (for events/targets), even if detailed stats disabled
  const statisticsContext = new StatisticsContextClass({
    verbosity,
    ...(checkOptions.logger !== undefined ? {logger: checkOptions.logger} : {})
  })

  const statisticsAggregator =
    checkOptions.statisticsAggregator ?? new DefaultStatisticsAggregator()
  const progressReporter = createProgressReporter(checkOptions, logging.logger)
  const resultReporter = createResultReporter<Rec>(
    checkOptions,
    verbosity,
    logging.logger
  )

  return {
    scenario,
    executableScenario,
    explorer,
    shrinker,
    shrinkBudget,
    sampler,
    randomGenerator,
    explorationBudget,
    detailedStatisticsEnabled,
    property,
    startTime,
    verbosity,
    logging,
    statisticsContext,
    statisticsAggregator,
    progressReporter,
    resultReporter,
    options: checkOptions
  }
}

/**
 * Run the exploration phase of property testing.
 * Returns exploration result and execution time.
 */
export function runExploration<Rec extends {}>(
  context: CheckExecutionContext<Rec>
): { explorationResult: ExplorationResult<Rec>; executionTimeMs: number } {
  const {
    executableScenario,
    property,
    sampler,
    explorationBudget,
    statisticsContext,
    detailedStatisticsEnabled,
    explorer,
    progressReporter,
    options,
    startTime
  } = context

  const explorerProgressCallback = options.onProgress !== undefined
    ? (progress: {
      testsRun: number
      testsPassed: number
      testsDiscarded: number
      totalTests?: number
      elapsedMs: number
    }) => {
      const progressInfo: ProgressInfo = {
        testsRun: progress.testsRun,
        testsPassed: progress.testsPassed,
        testsDiscarded: progress.testsDiscarded,
        elapsedMs: progress.elapsedMs,
        currentPhase: 'exploring',
        ...(progress.totalTests !== undefined && {totalTests: progress.totalTests})
      }

      if (progress.totalTests !== undefined && progress.totalTests > 0) {
        progressInfo.percentComplete = (progress.testsRun / progress.totalTests) * 100
      }

      progressReporter.onProgress(progressInfo)
    }
    : undefined

  const explorationResult = explorer.explore(
    executableScenario,
    property,
    sampler,
    explorationBudget,
    statisticsContext,
    detailedStatisticsEnabled,
    explorerProgressCallback
  )

  const endTime = Date.now()
  const executionTimeMs = endTime - startTime

  return {explorationResult, executionTimeMs}
}

/**
 * Emit final progress update after exploration completes.
 */
export function emitFinalProgress<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  explorationResult: ExplorationResult<Rec>
): void {
  const {progressReporter, explorationBudget, startTime} = context

  const finalProgress: ProgressInfo = {
    testsRun: explorationResult.testsRun,
    totalTests: explorationBudget.maxTests,
    testsPassed: explorationResult.outcome === 'passed'
      ? explorationResult.testsRun - explorationResult.skipped
      : 0,
    testsDiscarded: explorationResult.skipped,
    elapsedMs: Date.now() - startTime,
    currentPhase: 'exploring'
  }
  if (explorationBudget.maxTests > 0) {
    finalProgress.percentComplete = (explorationResult.testsRun / explorationBudget.maxTests) * 100
  }
  progressReporter.onFinal(finalProgress)
}

/**
 * Resolve the check outcome from exploration result.
 * Handles shrinking for both counterexamples and existential witnesses.
 */
export function resolveOutcome<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  exploration: { explorationResult: ExplorationResult<Rec>; executionTimeMs: number }
): CheckOutcome<Rec> {
  const {explorationResult, executionTimeMs} = exploration

  switch (explorationResult.outcome) {
    case 'passed':
      return resolvePassedOutcome(context, explorationResult, executionTimeMs)
    case 'exhausted':
      return resolveExhaustedOutcome(context, explorationResult, executionTimeMs)
    case 'failed':
      return resolveFailedOutcome(context, explorationResult, executionTimeMs)
  }
}

function resolvePassedOutcome<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  explorationResult: ExplorationResult<Rec> & { outcome: 'passed' },
  explorationTimeMs: number
): CheckOutcome<Rec> {
  const {scenario, logging} = context

  // For exists scenarios with a witness, shrink to find minimal satisfying values
  const witness = explorationResult.witness
  if (scenario.hasExistential && witness !== undefined) {
    logging.verbose('Shrinking witness...')

    const shrinkResult = withTiming(() =>
      context.shrinker.shrinkWitness(
        witness,
        context.executableScenario,
        context.explorer,
        context.property,
        context.sampler,
        context.shrinkBudget
      )
    )

    const example = extractExistentialWitness(scenario, shrinkResult.result.minimized)

    return {
      kind: 'exists-pass',
      satisfiable: true,
      example,
      statisticsInput: buildStatisticsInput({
        explorationResult,
        timeBreakdown: {exploration: explorationTimeMs, shrinking: shrinkResult.timeMs},
        counterexampleFound: false,
        shrinkingStats: toShrinkingStatistics(shrinkResult.result),
        ...(context.explorationBudget.passRateThreshold !== undefined && {
          passRateThreshold: context.explorationBudget.passRateThreshold
        })
      })
    }
  }

  // For forall-only scenarios that pass, return empty example
  return {
    kind: 'forall-pass',
    satisfiable: true,
    example: {} as Rec,
    statisticsInput: buildStatisticsInput({
      explorationResult,
      timeBreakdown: {exploration: explorationTimeMs, shrinking: 0},
      counterexampleFound: false,
      ...(context.explorationBudget.passRateThreshold !== undefined && {
        passRateThreshold: context.explorationBudget.passRateThreshold
      })
    })
  }
}

function resolveExhaustedOutcome<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  explorationResult: ExplorationResult<Rec> & { outcome: 'exhausted' },
  explorationTimeMs: number
): CheckOutcome<Rec> {
  // For forall-only scenarios, exhausted budget without counterexample is a (incomplete) pass.
  // For scenarios with exists, exhausted budget means no witness found.
  const satisfiable = !context.scenario.hasExistential

  return {
    kind: 'exhausted',
    satisfiable,
    example: {} as Rec,
    statisticsInput: buildStatisticsInput({
      explorationResult,
      timeBreakdown: {exploration: explorationTimeMs, shrinking: 0},
      counterexampleFound: false,
      ...(context.explorationBudget.passRateThreshold !== undefined && {
        passRateThreshold: context.explorationBudget.passRateThreshold
      })
    })
  }
}

function resolveFailedOutcome<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  explorationResult: ExplorationResult<Rec> & { outcome: 'failed' },
  explorationTimeMs: number
): CheckOutcome<Rec> {
  const {logging, shrinkBudget} = context
  const counterexample = explorationResult.counterexample

  logging.verbose('Shrinking counterexample...')
  logging.debug('Shrink budget', {
    attempts: shrinkBudget.maxAttempts,
    rounds: shrinkBudget.maxRounds
  })
  logging.debug('Counterexample', {counterexample: unwrapBoundTestCase(counterexample)})

  const shrinkResult = withTiming(() =>
    context.shrinker.shrink(
      counterexample,
      context.executableScenario,
      context.explorer,
      context.property,
      context.sampler,
      context.shrinkBudget
    )
  )

  logging.debug('Shrinking complete', {
    rounds: shrinkResult.result.rounds,
    attempts: shrinkResult.result.attempts
  })
  logging.debug('Minimized counterexample', {
    counterexample: unwrapBoundTestCase(shrinkResult.result.minimized)
  })

  return {
    kind: 'failed',
    satisfiable: false,
    example: unwrapBoundTestCase(shrinkResult.result.minimized),
    statisticsInput: buildStatisticsInput({
      explorationResult,
      timeBreakdown: {exploration: explorationTimeMs, shrinking: shrinkResult.timeMs},
      counterexampleFound: true,
      shrinkingStats: toShrinkingStatistics(shrinkResult.result),
      ...(context.explorationBudget.passRateThreshold !== undefined && {
        passRateThreshold: context.explorationBudget.passRateThreshold
      })
    })
  }
}

/**
 * Build final FluentResult from the resolved outcome.
 */
export function buildResult<Rec extends {}>(
  context: CheckExecutionContext<Rec>,
  outcome: CheckOutcome<Rec>
): FluentResult<Rec> {
  const statistics = context.statisticsAggregator.aggregate(outcome.statisticsInput)
  return new FluentResult<Rec>(
    outcome.satisfiable,
    outcome.example,
    statistics,
    context.randomGenerator.seed,
    outcome.statisticsInput.skipped
  )
}

/**
 * Builds a property function from scenario's then nodes and given/when nodes.
 */
export function buildPropertyFunction<Rec extends {}>(scenario: Scenario<Rec>): (testCase: Rec) => boolean {
  const givenNodes: GivenNode<Rec>[] = []
  const whenNodes: WhenNode<Rec>[] = []
  const thenNodes: ThenNode<Rec>[] = []

  for (const node of scenario.nodes) {
    switch (node.type) {
      case 'given':
        givenNodes.push(node)
        break
      case 'when':
        whenNodes.push(node)
        break
      case 'then':
        thenNodes.push(node)
        break
    }
  }

  return (testCase: Rec): boolean => {
    // Apply given predicates to compute derived values
    const fullTestCase: Record<string, unknown> = {...testCase}

    for (const given of givenNodes) {
      if (given.isFactory) {
        const factory = given.predicate as (args: Rec) => unknown
        fullTestCase[given.name] = factory(fullTestCase as Rec)
      } else {
        fullTestCase[given.name] = given.predicate
      }
    }

    // Execute when predicates (side effects)
    for (const when of whenNodes) {
      when.predicate(fullTestCase as Rec)
    }

    // Evaluate all then predicates
    for (const then of thenNodes) {
      if (!then.predicate(fullTestCase as Rec)) {
        return false
      }
    }

    return true
  }
}

/**
 * Run a complete check execution.
 * This is the main orchestration function that coordinates all phases.
 */
export function runCheck<Rec extends {}>(
  scenario: Scenario<Rec>,
  executionConfig: ExecutionConfig,
  options?: CheckOptions
): FluentResult<Rec> {
  const context = prepareCheckExecution(scenario, executionConfig, options)

  const exploration = runExploration(context)

  emitFinalProgress(context, exploration.explorationResult)

  const outcome = resolveOutcome(context, exploration)
  const result = buildResult(context, outcome)

  context.resultReporter.onComplete(result)

  return result
}
