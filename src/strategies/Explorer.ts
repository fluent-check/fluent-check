import type {FluentPick} from '../arbitraries/index.js'
import type {Scenario, ScenarioNode} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../ExecutableScenario.js'
import {PreconditionFailure} from '../FluentCheck.js'
import type {Sampler} from './Sampler.js'
import type {BoundTestCase} from './types.js'

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
}

/**
 * A counterexample was found.
 */
export interface ExplorationFailed<Rec extends {}> {
  readonly outcome: 'failed'
  readonly counterexample: BoundTestCase<Rec>
  readonly testsRun: number
  readonly skipped: number
}

/**
 * Budget exhausted before finding failure (for forall)
 * or finding witness (for exists).
 */
export interface ExplorationExhausted {
  readonly outcome: 'exhausted'
  readonly testsRun: number
  readonly skipped: number
}

type PropertyEvaluation = 'passed' | 'failed' | 'skipped'

interface ExplorationState {
  testsRun: number
  skipped: number
  budgetExceeded: boolean
  startTime: number
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

  passed(witness?: BoundTestCase<Rec>): ExplorationPassed<Rec> {
    return witness !== undefined
      ? {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped,
        witness
      }
      : {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped
      }
  }

  failed(counterexample: BoundTestCase<Rec>): ExplorationFailed<Rec> {
    return {
      outcome: 'failed',
      counterexample,
      testsRun: this.state.testsRun,
      skipped: this.state.skipped
    }
  }

  exhausted(): ExplorationExhausted {
    return {
      outcome: 'exhausted',
      testsRun: this.state.testsRun,
      skipped: this.state.skipped
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
 * Interface for exploring the search space of a property test scenario.
 */
export interface Explorer<Rec extends {}> {
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
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
    budget: ExplorationBudget
  ): ExplorationResult<Rec> {
    const executableScenario = this.toExecutableScenario(scenario)
    const quantifiers = executableScenario.quantifiers
    const samples = this.generateSamples(quantifiers, sampler, budget.maxTests)
    const evaluator = this.createEvaluator(executableScenario.nodes, property)

    const state: ExplorationState = {
      testsRun: 0,
      skipped: 0,
      budgetExceeded: false,
      startTime: Date.now()
    }

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
      results
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
  }

  protected createEvaluator(
    nodes: readonly ScenarioNode<Rec>[],
    property: (testCase: Rec) => boolean
  ): TestCaseEvaluator<Rec> {
    const hasThenNodes = nodes.some(node => node.type === 'then')

    if (!hasThenNodes) {
      return (testCase: BoundTestCase<Rec>, state: ExplorationState) => {
        state.testsRun += 1
        try {
          return property(this.unwrapTestCase(testCase)) ? 'passed' : 'failed'
        } catch (e) {
          if (this.isPreconditionFailure(e)) {
            state.skipped += 1
            return 'skipped'
          }
          throw e
        }
      }
    }

    return (testCase: BoundTestCase<Rec>, state: ExplorationState) => {
      state.testsRun += 1
      try {
        return this.evaluateScenarioNodes(testCase, nodes) ? 'passed' : 'failed'
      } catch (e) {
        if (this.isPreconditionFailure(e)) {
          state.skipped += 1
          return 'skipped'
        }
        throw e
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
          if (!node.predicate(record)) {
            return false
          }
          break
      }
    }

    return true
  }

  protected unwrapTestCase(testCase: BoundTestCase<Rec>): Rec {
    const entries = Object.entries(testCase) as Array<[string, FluentPick<unknown>]>
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
      samples.set(q.name, q.sample(sampler, perQuantifier))
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
    const quantifierSamples = this.samplesFor(frame)
    let sawBudgetLimit = false

    for (const sample of quantifierSamples) {
      const newTestCase = this.bindSample(frame, sample)
      const outcome = next(frame.index + 1, newTestCase, frame.ctx)

      if (outcome.kind === 'pass') {
        return frame.ctx.outcomes.pass(outcome.witness ?? newTestCase)
      }

      if (outcome.kind === 'inconclusive') {
        if (outcome.budgetExceeded) {
          sawBudgetLimit = true
          break
        }
        continue
      }
      // fail - try next sample
    }

    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
  }

  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> {
    const quantifierSamples = this.samplesFor(frame)
    const hasInnerExists = this.hasInnerExistential(frame.ctx.quantifiers, frame.index + 1)

    let allPassed = true
    let lastWitness: BoundTestCase<Rec> | undefined
    let sawBudgetLimit = false

    for (const sample of quantifierSamples) {
      const newTestCase = this.bindSample(frame, sample)
      const outcome = next(frame.index + 1, newTestCase, frame.ctx)

      if (outcome.kind === 'fail') {
        return frame.ctx.outcomes.fail(outcome.counterexample)
      }

      if (outcome.kind === 'pass') {
        if (outcome.witness !== undefined) lastWitness = outcome.witness
        continue
      }

      if (outcome.budgetExceeded) {
        sawBudgetLimit = true
        allPassed = false
        break
      }

      if (hasInnerExists) {
        return frame.ctx.outcomes.fail(newTestCase)
      }

      allPassed = false
    }

    if (allPassed && quantifierSamples.length > 0) {
      return frame.ctx.outcomes.pass(lastWitness)
    }

    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
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
}

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}

export type {BoundTestCase} from './types.js'
