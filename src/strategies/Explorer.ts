import type {FluentPick} from '../arbitraries/index.js'
import type {
  Scenario,
  ScenarioNode,
  ClassifyNode,
  LabelNode,
  CollectNode,
  CoverNode,
  CoverTableNode
} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../ExecutableScenario.js'
import {PreconditionFailure} from '../FluentCheck.js'
import type {Sampler} from './Sampler.js'
import type {BoundTestCase} from './types.js'
import type {StatisticsContext} from '../statistics.js'
import {runWithStatisticsContext} from '../statistics.js'

/**
 * Budget constraints for exploration.
 */
export interface ExplorationBudget {
  /**
   * Maximum number of property evaluations.
   */
  readonly maxTests: number

  /**
   * Optional time limit in milliseconds.
   * If set, exploration MAY stop early when exceeded.
   */
  readonly maxTime?: number
}

/**
 * Detailed statistics from exploration (optional).
 */
export interface DetailedExplorationStats {
  /** Per-arbitrary statistics (only when detailed statistics enabled) */
  arbitraryStats?: Record<string, import('../statistics.js').ArbitraryStatistics>
  /** Event counts (if any events were recorded) */
  events?: Record<string, number>
  /** Target statistics (if any targets were recorded) */
  targets?: Record<string, import('../statistics.js').TargetStatistics>
}

/**
 * Result of property exploration - a discriminated union.
 */
export type ExplorationResult<Rec extends {}> =
  | ExplorationPassed<Rec>
  | ExplorationFailed<Rec>
  | ExplorationExhausted

/**
 * All tested cases satisfied the property.
 * For exists scenarios, includes the witness that satisfied the property.
 */
export interface ExplorationPassed<Rec extends {} = {}> {
  readonly outcome: 'passed'
  readonly testsRun: number
  readonly skipped: number
  /**
   * For exists scenarios, the witness that satisfied the property.
   * For forall-only scenarios, this may be undefined or empty.
   */
  readonly witness?: BoundTestCase<Rec>
  /** Label counts for test case classifications (optional) */
  readonly labels?: Record<string, number>
  /** Detailed statistics (optional, when detailed statistics are enabled) */
  readonly detailedStats?: DetailedExplorationStats
}

/**
 * A counterexample was found.
 */
export interface ExplorationFailed<Rec extends {}> {
  readonly outcome: 'failed'
  readonly counterexample: BoundTestCase<Rec>
  readonly testsRun: number
  readonly skipped: number
  /** Label counts for test case classifications (optional) */
  readonly labels?: Record<string, number>
  /** Detailed statistics (optional, when detailed statistics are enabled) */
  readonly detailedStats?: DetailedExplorationStats
}

/**
 * Budget exhausted before finding failure (for forall)
 * or finding witness (for exists).
 */
export interface ExplorationExhausted {
  readonly outcome: 'exhausted'
  readonly testsRun: number
  readonly skipped: number
  /** Label counts for test case classifications (optional) */
  readonly labels?: Record<string, number>
  /** Detailed statistics (optional, when detailed statistics are enabled) */
  readonly detailedStats?: DetailedExplorationStats
}

type PropertyEvaluation = 'passed' | 'failed' | 'skipped'

interface ExplorationState {
  testsRun: number
  skipped: number
  budgetExceeded: boolean
  startTime: number
  labels: Map<string, number>
}

interface TraversalContext<Rec extends {}> {
  readonly quantifiers: readonly ExecutableQuantifier[]
  readonly samples: Map<string, FluentPick<unknown>[]>
  readonly evaluator: TestCaseEvaluator<Rec>
  readonly budget: ExplorationBudget
  readonly state: ExplorationState
  readonly hasExistential: boolean
  readonly outcomes: TraversalOutcomeBuilder<Rec>
  readonly results: ExplorationResultBuilder<Rec>
  readonly statisticsContext?: StatisticsContext | undefined
  readonly executableScenario: ExecutableScenario<Rec>
  readonly detailedStatisticsEnabled?: boolean
  readonly progressCallback?: ProgressCallback
}

type TraversalOutcome<Rec extends {}> =
  | {kind: 'pass'; witness?: BoundTestCase<Rec>}
  | {kind: 'fail'; counterexample: BoundTestCase<Rec>}
  | {kind: 'inconclusive'; budgetExceeded: boolean}

type TraverseNext<Rec extends {}> = (
  quantifierIndex: number,
  testCase: BoundTestCase<Rec>,
  ctx: TraversalContext<Rec>
) => TraversalOutcome<Rec>

interface QuantifierSemantics<Rec extends {}> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
}

class TraversalOutcomeBuilder<Rec extends {}> {
  pass(witness?: BoundTestCase<Rec>): TraversalOutcome<Rec> {
    return witness !== undefined ? {kind: 'pass', witness} : {kind: 'pass'}
  }

  fail(counterexample: BoundTestCase<Rec>): TraversalOutcome<Rec> {
    return {kind: 'fail', counterexample}
  }

  inconclusive(budgetExceeded: boolean): TraversalOutcome<Rec> {
    return {kind: 'inconclusive', budgetExceeded}
  }
}

class ExplorationResultBuilder<Rec extends {}> {
  constructor(private readonly state: ExplorationState) {}

  private labelsToRecord(): Record<string, number> | undefined {
    if (this.state.labels.size === 0) {
      return undefined
    }
    return Object.fromEntries(this.state.labels)
  }

  passed(witness?: BoundTestCase<Rec>): ExplorationPassed<Rec> {
    const labels = this.labelsToRecord()
    return witness !== undefined
      ? {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped,
        witness,
        ...(labels !== undefined && {labels})
      }
      : {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped,
        ...(labels !== undefined && {labels})
      }
  }

  failed(counterexample: BoundTestCase<Rec>): ExplorationFailed<Rec> {
    const labels = this.labelsToRecord()
    return {
      outcome: 'failed',
      counterexample,
      testsRun: this.state.testsRun,
      skipped: this.state.skipped,
      ...(labels !== undefined && {labels})
    }
  }

  exhausted(): ExplorationExhausted {
    const labels = this.labelsToRecord()
    return {
      outcome: 'exhausted',
      testsRun: this.state.testsRun,
      skipped: this.state.skipped,
      ...(labels !== undefined && {labels})
    }
  }
}

interface QuantifierFrame<Rec extends {}> {
  readonly index: number
  readonly quantifier: ExecutableQuantifier
  readonly testCase: BoundTestCase<Rec>
  readonly ctx: TraversalContext<Rec>
}

type TestCaseEvaluator<Rec extends {}> =
  (testCase: BoundTestCase<Rec>, state: ExplorationState) => PropertyEvaluation

/**
 * Progress callback function type for reporting exploration progress.
 */
export type ProgressCallback = (info: {
  testsRun: number
  testsPassed: number
  testsDiscarded: number
  totalTests?: number
  elapsedMs: number
}) => void

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

    const state: ExplorationState = {
      testsRun: 0,
      skipped: 0,
      budgetExceeded: false,
      startTime: Date.now(),
      labels: new Map<string, number>()
    }

    const evaluator = this.createEvaluator(executableScenario.nodes, property, statisticsContext, progressCallback, state, budget)

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
        } catch (_e) {
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
    if (state.testsRun >= budget.maxTests) {
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
}

/**
 * Nested loop explorer implementing the traditional property testing approach.
 */
export class NestedLoopExplorer<Rec extends {}> extends AbstractExplorer<Rec> {
  protected quantifierSemantics(): QuantifierSemantics<Rec> {
    return new NestedLoopSemantics<Rec>()
  }
}

class NestedLoopSemantics<Rec extends {}> implements QuantifierSemantics<Rec> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> {
    let sawBudgetLimit = false

    const result = this.forEachSample(frame, next, (outcome, testCase) => {
      if (outcome.kind === 'pass') {
        return frame.ctx.outcomes.pass(outcome.witness ?? testCase)
      }
      if (outcome.kind === 'inconclusive' && outcome.budgetExceeded) {
        sawBudgetLimit = true
        return 'break'
      }
      return 'continue'
    })

    if (result !== 'break' && result !== 'continue') return result
    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
  }

  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> {
    let sawBudgetLimit = false
    let allPassed = true
    let lastWitness: BoundTestCase<Rec> | undefined
    const hasInnerExists = this.hasInnerExistential(frame.ctx.quantifiers, frame.index + 1)

    const result = this.forEachSample(frame, next, (outcome, testCase) => {
      if (outcome.kind === 'fail') {
        return frame.ctx.outcomes.fail(outcome.counterexample)
      }
      if (outcome.kind === 'pass') {
        if (outcome.witness !== undefined) lastWitness = outcome.witness
        return 'continue'
      }
      if (outcome.budgetExceeded) {
        sawBudgetLimit = true
        allPassed = false
        return 'break'
      }
      if (hasInnerExists) {
        return frame.ctx.outcomes.fail(testCase)
      }
      allPassed = false
      return 'continue'
    })

    if (result !== 'break' && result !== 'continue') return result

    if (allPassed && this.samplesFor(frame).length > 0) {
      return frame.ctx.outcomes.pass(lastWitness)
    }

    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
  }

  private forEachSample(
    frame: QuantifierFrame<Rec>,
    next: TraverseNext<Rec>,
    visitor: (
      outcome: TraversalOutcome<Rec>,
      testCase: BoundTestCase<Rec>
    ) => TraversalOutcome<Rec> | 'continue' | 'break'
  ): TraversalOutcome<Rec> | 'break' | 'continue' {
    const samples = this.samplesFor(frame)
    for (const sample of samples) {
      this.trackSampleStatistics(frame, sample)
      const newTestCase = this.bindSample(frame, sample)
      const outcome = next(frame.index + 1, newTestCase, frame.ctx)
      const result = visitor(outcome, newTestCase)
      if (result !== 'continue') return result
    }
    return 'continue'
  }

  private samplesFor(frame: QuantifierFrame<Rec>): readonly FluentPick<unknown>[] {
    return frame.ctx.samples.get(frame.quantifier.name) ?? []
  }

  private bindSample(
    frame: QuantifierFrame<Rec>,
    sample: FluentPick<unknown>
  ): BoundTestCase<Rec> {
    return {...frame.testCase, [frame.quantifier.name]: sample}
  }

  private hasInnerExistential(quantifiers: readonly ExecutableQuantifier[], startIndex: number) {
    return quantifiers.slice(startIndex).some(q => q.type === 'exists')
  }

  /**
   * Track statistics for a sample value.
   * This helper method eliminates code duplication between exists() and forall().
   */
  private trackSampleStatistics(
    frame: QuantifierFrame<Rec>,
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
      (n): n is import('../Scenario.js').QuantifierNode =>
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

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}

export type {BoundTestCase} from './types.js'
