import type {FluentPick} from '../../arbitraries/index.js'
import type {
  Scenario,
  ScenarioNode,
  ClassifyNode,
  LabelNode,
  CollectNode,
  CoverNode,
  CoverTableNode,
  QuantifierNode
} from '../../Scenario.js'
import {createExecutableScenario} from '../../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../../ExecutableScenario.js'
import {PreconditionFailure} from '../../check/preconditions.js'
import type {Sampler} from '../Sampler.js'
import type {BoundTestCase} from '../types.js'
import type {StatisticsContext} from '../../statistics.js'
import {runWithStatisticsContext, calculateBayesianConfidence} from '../../statistics.js'

import type {ExplorationBudget} from './types/ExplorationBudget.js'
import type {ExplorationResult, DetailedExplorationStats} from './types/ExplorationResult.js'
import type {ExplorationState} from './types/ExplorationState.js'
import {createExplorationState} from './types/ExplorationState.js'
import type {
  TraversalContext,
  TraversalOutcome,
  TraverseNext,
  QuantifierFrame,
  QuantifierSemantics,
  ProgressCallback,
  PropertyEvaluation,
  TestCaseEvaluator
} from './types/TraversalContext.js'
import {TraversalOutcomeBuilder} from './builders/TraversalOutcomeBuilder.js'
import {ExplorationResultBuilder} from './builders/ExplorationResultBuilder.js'

/**
 * Interface for exploring the search space of a property test scenario.
 */
export interface Explorer<Rec extends {}> {
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget,
    statisticsContext?: StatisticsContext,
    detailedStatisticsEnabled?: boolean,
    progressCallback?: ProgressCallback
  ): ExplorationResult<Rec>
}

/**
 * Base explorer that handles traversal, leaving quantifier semantics to subclasses.
 */
export abstract class AbstractExplorer<Rec extends {}> implements Explorer<Rec> {
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget,
    statisticsContext?: StatisticsContext,
    detailedStatisticsEnabled = false,
    progressCallback?: ProgressCallback
  ): ExplorationResult<Rec> {
    const executableScenario = this.toExecutableScenario(scenario)
    const quantifiers = executableScenario.quantifiers
    const samples = this.generateSamples(quantifiers, sampler, budget.maxTests)

    const state = createExplorationState()

    const evaluator = this.createEvaluator(
      executableScenario.nodes, property, statisticsContext, progressCallback, state, budget
    )

    const outcomes = new TraversalOutcomeBuilder<Rec>()
    const results = new ExplorationResultBuilder<Rec>(state)

    const ctx: TraversalContext<Rec> = {
      quantifiers,
      samples,
      evaluator,
      budget,
      state,
      hasExistential: executableScenario.hasExistential,
      outcomes,
      results,
      ...(statisticsContext !== undefined && {statisticsContext}),
      executableScenario,
      detailedStatisticsEnabled,
      ...(progressCallback !== undefined && {progressCallback})
    }

    const outcome = this.traverse(0, {} as BoundTestCase<Rec>, ctx)
    return this.toExplorationResult(outcome, ctx)
  }

  protected traverse(
    quantifierIndex: number,
    testCase: BoundTestCase<Rec>,
    ctx: TraversalContext<Rec>
  ): TraversalOutcome<Rec> {
    const budgetOutcome = this.ensureBudget(ctx)
    if (budgetOutcome !== null) return budgetOutcome

    const leafOutcome = this.tryLeaf(quantifierIndex, testCase, ctx)
    if (leafOutcome !== null) return leafOutcome

    const quantifier = ctx.quantifiers[quantifierIndex]
    if (quantifier === undefined) return ctx.outcomes.inconclusive(false)

    const frame: QuantifierFrame<Rec> = {
      index: quantifierIndex,
      quantifier,
      testCase,
      ctx
    }

    const handler = this.quantifierHandlers()[quantifier.type]
    return handler(frame)
  }

  protected abstract quantifierSemantics(): QuantifierSemantics<Rec>

  /**
   * Quantifier handlers map to avoid scattered conditionals.
   */
  protected quantifierHandlers(): Record<'forall' | 'exists', (frame: QuantifierFrame<Rec>) => TraversalOutcome<Rec>> {
    const semantics = this.quantifierSemantics()
    const next: TraverseNext<Rec> = (index, testCase, ctx) => this.traverse(index, testCase, ctx)
    return {
      exists: frame => semantics.exists(frame, next),
      forall: frame => semantics.forall(frame, next)
    }
  }

  protected tryLeaf(
    quantifierIndex: number,
    testCase: BoundTestCase<Rec>,
    ctx: TraversalContext<Rec>
  ): TraversalOutcome<Rec> | null {
    if (quantifierIndex < ctx.quantifiers.length) return null

    const evaluation = ctx.evaluator(testCase, ctx.state)

    if (evaluation === 'passed') return ctx.outcomes.pass({...testCase})
    if (evaluation === 'failed') return ctx.outcomes.fail({...testCase})

    return ctx.outcomes.inconclusive(false)
  }

  protected ensureBudget(ctx: TraversalContext<Rec>): TraversalOutcome<Rec> | null {
    return this.isOutOfBudget(ctx.budget, ctx.state)
      ? ctx.outcomes.inconclusive(true)
      : null
  }

  protected toExplorationResult(outcome: TraversalOutcome<Rec>, ctx: TraversalContext<Rec>): ExplorationResult<Rec> {
    // Build detailed stats if context is available
    // Statistics inclusion rules:
    // - arbitraryStats: Only included if detailedStatisticsEnabled is true
    // - events: Always included if any events were recorded (independent of detailedStatisticsEnabled)
    // - targets: Always included if any targets were recorded (independent of detailedStatisticsEnabled)
    // This allows events/targets to work without detailed statistics overhead
    let detailedStats: DetailedExplorationStats | undefined = undefined
    if (ctx.statisticsContext !== undefined) {
      const eventCounts = ctx.statisticsContext.getEventCounts()
      const targetStats = ctx.statisticsContext.getTargetStatistics()
      const arbitraryStats = ctx.statisticsContext.getArbitraryStatistics()

      const stats: DetailedExplorationStats = {}
      if (ctx.detailedStatisticsEnabled === true) {
        // Include arbitraryStats even if empty (for consistency when detailed stats enabled)
        stats.arbitraryStats = arbitraryStats
      }
      if (Object.keys(eventCounts).length > 0) {
        stats.events = eventCounts
      }
      if (Object.keys(targetStats).length > 0) {
        stats.targets = targetStats
      }

      // Only set detailedStats if there's at least one stat
      if (Object.keys(stats).length > 0) {
        detailedStats = stats
      }
    }

    const baseResult = (() => {
      switch (outcome.kind) {
        case 'pass':
          return ctx.results.passed(outcome.witness)
        case 'fail':
          return ctx.results.failed(outcome.counterexample)
        case 'inconclusive':
          return ctx.state.budgetExceeded || ctx.hasExistential || outcome.budgetExceeded
            ? ctx.results.exhausted()
            : ctx.results.passed()
      }
    })()

    return detailedStats !== undefined ? {...baseResult, detailedStats} : baseResult
  }

  protected createEvaluator(
    nodes: readonly ScenarioNode<Rec>[],
    property: (testCase: Rec) => boolean,
    statisticsContext?: StatisticsContext,
    progressCallback?: ProgressCallback,
    state?: ExplorationState,
    budget?: ExplorationBudget
  ): TestCaseEvaluator<Rec> {
    const classificationNodes = nodes.filter(
      (node): node is ClassifyNode<Rec> | LabelNode<Rec> | CollectNode<Rec> | CoverNode<Rec> | CoverTableNode<Rec> =>
        node.type === 'classify' || node.type === 'label' || node.type === 'collect' ||
        node.type === 'cover' || node.type === 'coverTable'
    )
    const hasThenNodes = nodes.some(node => node.type === 'then')

    const callProgressCallback = (evalState: ExplorationState, lastResult?: PropertyEvaluation) => {
      if (progressCallback !== undefined && state !== undefined && budget !== undefined) {
        try {
          // Calculate testsPassed: testsRun - skipped - (1 if last test failed, 0 otherwise)
          // We track this approximately - actual count requires tracking pass/fail separately
          // For progress purposes, this approximation is sufficient
          const testsPassed = Math.max(0, evalState.testsRun - evalState.skipped - (lastResult === 'failed' ? 1 : 0))
          progressCallback({
            testsRun: evalState.testsRun,
            testsPassed,
            testsDiscarded: evalState.skipped,
            totalTests: budget.maxTests,
            elapsedMs: Date.now() - evalState.startTime
          })
        } catch {
          // Progress callback errors should not stop execution
          // Logging would require verbosity context, so we silently continue
        }
      }
    }

    if (!hasThenNodes) {
      return (testCase: BoundTestCase<Rec>, evalState: ExplorationState) => {
        evalState.testsRun += 1

        const runTest = () => {
          // Evaluate classifications before property evaluation (so discarded tests are still classified)
          this.evaluateClassifications(testCase, classificationNodes, evalState)
          try {
            const unwrapped = this.unwrapTestCase(testCase)
            const result = property(unwrapped) ? 'passed' : 'failed'
            // Track pass/fail for confidence calculation
            if (result === 'passed') {
              evalState.testsPassed += 1
            } else {
              evalState.testsFailed += 1
            }
            callProgressCallback(evalState, result)
            return result
          } catch (e) {
            if (this.isPreconditionFailure(e)) {
              evalState.skipped += 1
              callProgressCallback(evalState, 'skipped')
              return 'skipped'
            }
            throw e
          }
        }

        if (statisticsContext !== undefined) {
          statisticsContext.setTestCaseIndex(evalState.testsRun)
          return runWithStatisticsContext(statisticsContext, runTest)
        } else {
          return runTest()
        }
      }
    }

    return (testCase: BoundTestCase<Rec>, evalState: ExplorationState) => {
      evalState.testsRun += 1

      const runTest = () => {
        // Evaluate classifications before scenario evaluation (so discarded tests are still classified)
        this.evaluateClassifications(testCase, classificationNodes, evalState)
        try {
          // Context is already set above, evaluateScenarioNodes will use it
          const result = this.evaluateScenarioNodes(testCase, nodes) ? 'passed' : 'failed'
          // Track pass/fail for confidence calculation
          if (result === 'passed') {
            evalState.testsPassed += 1
          } else {
            evalState.testsFailed += 1
          }
          callProgressCallback(evalState, result)
          return result
        } catch (e) {
          if (this.isPreconditionFailure(e)) {
            evalState.skipped += 1
            callProgressCallback(evalState, 'skipped')
            return 'skipped'
          }
          throw e
        }
      }

      if (statisticsContext !== undefined) {
        statisticsContext.setTestCaseIndex(evalState.testsRun)
        return runWithStatisticsContext(statisticsContext, runTest)
      } else {
        return runTest()
      }
    }
  }

  protected evaluateClassifications(
    testCase: BoundTestCase<Rec>,
    classificationNodes: readonly (
      ClassifyNode<Rec> | LabelNode<Rec> | CollectNode<Rec> | CoverNode<Rec> | CoverTableNode<Rec>
    )[],
    state: ExplorationState
  ): void {
    if (classificationNodes.length === 0) {
      return
    }

    const record = this.unwrapTestCase(testCase)

    for (const node of classificationNodes) {
      let label: string
      switch (node.type) {
        case 'classify':
          if (node.predicate(record)) {
            label = node.label
            state.labels.set(label, (state.labels.get(label) ?? 0) + 1)
          }
          break
        case 'label':
          label = node.fn(record)
          state.labels.set(label, (state.labels.get(label) ?? 0) + 1)
          break
        case 'collect':
          label = String(node.fn(record))
          state.labels.set(label, (state.labels.get(label) ?? 0) + 1)
          break
        case 'cover':
          // Cover nodes work like classify nodes - count label when predicate is true
          if (node.predicate(record)) {
            label = node.label
            state.labels.set(label, (state.labels.get(label) ?? 0) + 1)
          }
          break
        case 'coverTable': {
          // CoverTable nodes work like label nodes - get category and count with qualified name
          const category = node.getCategory(record)
          if (category in node.categories) {
            label = `${node.name}.${category}`
            state.labels.set(label, (state.labels.get(label) ?? 0) + 1)
          }
          // If category not in categories object, ignore (could log warning in future)
          break
        }
      }
    }
  }

  protected evaluateScenarioNodes(
    testCase: BoundTestCase<Rec>,
    nodes: readonly ScenarioNode<Rec>[]
  ): boolean {
    const values: Record<string, unknown> = {...this.unwrapTestCase(testCase)}
    const record = values as Rec

    for (const node of nodes) {
      switch (node.type) {
        case 'forall':
        case 'exists':
          break
        case 'given':
          values[node.name] =
            node.isFactory && typeof node.predicate === 'function'
              ? node.predicate(record)
              : node.predicate
          break
        case 'when':
          node.predicate(record)
          break
        case 'then':
          // Context should already be set by the evaluator before this method is called
          if (!node.predicate(record)) {
            return false
          }
          break
        case 'classify':
        case 'label':
        case 'collect':
        case 'cover':
        case 'coverTable':
          // Classifications and coverage requirements are evaluated separately before scenario evaluation
          break
      }
    }

    return true
  }

  protected unwrapTestCase(testCase: BoundTestCase<Rec>): Rec {
    const entries: Array<[string, FluentPick<unknown>]> = Object.entries(testCase)
    const values = entries.map(([key, pick]) => [key, pick.value] as const)
    return Object.fromEntries(values) as Rec
  }

  protected generateSamples(
    quantifiers: readonly ExecutableQuantifier[],
    sampler: Sampler,
    maxTests: number
  ): Map<string, FluentPick<unknown>[]> {
    const samples = new Map<string, FluentPick<unknown>[]>()

    if (maxTests <= 0) {
      for (const q of quantifiers) {
        samples.set(q.name, [])
      }
      return samples
    }

    const quantifierCount = Math.max(quantifiers.length, 1)
    const perQuantifier = Math.max(1, Math.floor(maxTests ** (1 / quantifierCount)))

    for (const q of quantifiers) {
      const quantifierSamples = q.sample(sampler, perQuantifier)
      samples.set(q.name, quantifierSamples)

      // Track statistics if context is available (passed via explore method)
      // Note: We'll track samples during traversal, not here during generation
      // This is a placeholder for future enhancement
    }

    return samples
  }

  protected toExecutableScenario(scenario: ExecutableScenario<Rec> | Scenario<Rec>) {
    return this.isExecutableScenario(scenario)
      ? scenario
      : createExecutableScenario(scenario)
  }

  protected isExecutableScenario(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>
  ): scenario is ExecutableScenario<Rec> {
    const q = scenario.quantifiers[0] as ExecutableQuantifier | undefined
    return typeof q?.sample === 'function' && typeof q?.shrink === 'function'
  }

  protected isOutOfBudget(budget: ExplorationBudget, state: ExplorationState): boolean {
    const MIN_TESTS_FOR_CONFIDENCE = 10
    // Check confidence periodically (configurable interval, default 100 tests)
    const shouldCheckConfidence = budget.targetConfidence !== undefined || budget.minConfidence !== undefined
    const confidenceCheckInterval = budget.confidenceCheckInterval ?? 100
    const shouldCheckNow = shouldCheckConfidence &&
      (state.testsRun - state.lastConfidenceCheck >= confidenceCheckInterval || state.testsRun >= budget.maxTests)

    if (shouldCheckNow && state.testsRun > 0) {
      if (state.testsRun >= MIN_TESTS_FOR_CONFIDENCE) {
        const threshold = budget.passRateThreshold ?? 0.999
        const confidence = calculateBayesianConfidence(state.testsPassed, state.testsFailed, threshold)

        // Early termination: if target confidence reached, stop
        if (budget.targetConfidence !== undefined && confidence >= budget.targetConfidence) {
          state.budgetExceeded = false // Not really exceeded, just reached target
          return true
        }
      }
      state.lastConfidenceCheck = state.testsRun
    }

    // Check maxIterations safety bound
    if (budget.maxIterations !== undefined && state.testsRun >= budget.maxIterations) {
      state.budgetExceeded = true
      return true
    }

    // Check maxTests
    if (state.testsRun >= budget.maxTests) {
      // If minConfidence is set and not met, continue (unless maxIterations reached)
      if (budget.minConfidence !== undefined) {
        if (state.testsRun >= MIN_TESTS_FOR_CONFIDENCE) {
          const threshold = budget.passRateThreshold ?? 0.999
          const confidence = calculateBayesianConfidence(state.testsPassed, state.testsFailed, threshold)
          if (confidence < budget.minConfidence) {
            // Continue past maxTests if maxIterations allows
            if (budget.maxIterations === undefined || state.testsRun < budget.maxIterations) {
              return false // Continue exploring
            }
          }
        } else {
          // Not enough tests yet, continue if maxIterations allows
          if (budget.maxIterations === undefined || state.testsRun < budget.maxIterations) {
            return false // Continue exploring
          }
        }
      }
      state.budgetExceeded = true
      return true
    }

    if (budget.maxTime !== undefined && Date.now() - state.startTime > budget.maxTime) {
      state.budgetExceeded = true
      return true
    }

    return false
  }

  protected isPreconditionFailure(e: unknown): e is PreconditionFailure {
    return e instanceof PreconditionFailure
  }

  /**
   * Track statistics for a sample value.
   * This helper method eliminates code duplication between exists() and forall().
   */
  protected trackSampleStatistics(
    frame: QuantifierFrame<Rec> | any, // Use union to allow FlatExplorer's any usage or strict QuantifierFrame
    sample: FluentPick<unknown>
  ): void {
    if (frame.ctx.statisticsContext === undefined || frame.ctx.detailedStatisticsEnabled !== true) {
      return
    }

    const collector = frame.ctx.statisticsContext.getCollector(frame.quantifier.name)

    // Get arbitrary from scenario nodes (for corner cases).
    // Note: ExecutableQuantifier doesn't contain the original Arbitrary, so we must
    // look it up from the nodes array. The quantifier should always exist in nodes
    // since ExecutableScenario is created from Scenario which includes quantifier nodes.
    const quantifierNode = frame.ctx.executableScenario.nodes.find(
      (n: any): n is QuantifierNode =>
        (n.type === 'forall' || n.type === 'exists') && n.name === frame.quantifier.name
    )

    if (quantifierNode !== undefined) {
      collector.recordSample(sample.value, quantifierNode.arbitrary)
    } else {
      // Fallback: record sample without corner case checking.
      // This should be rare - only if quantifier node is missing from nodes array.
      collector.recordSample(sample.value, {
        cornerCases: () => [],
        hashCode: () => (a: unknown) => typeof a === 'number' ? a | 0 : 0,
        equals: () => (a: unknown, b: unknown) => a === b
      })
    }

    // Track numeric values for distribution
    if (typeof sample.value === 'number' && Number.isFinite(sample.value)) {
      collector.recordNumericValue(sample.value)
    }

    // Track array/string lengths separately
    if (Array.isArray(sample.value)) {
      collector.recordArrayLength(sample.value.length)
    } else if (typeof sample.value === 'string') {
      collector.recordStringLength(sample.value.length)
    }
  }
}
