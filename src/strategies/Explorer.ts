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

type TraversalOutcome<Rec extends {}> =
  | {kind: 'pass'; witness?: BoundTestCase<Rec>}
  | {kind: 'fail'; counterexample: BoundTestCase<Rec>}
  | {kind: 'inconclusive'; budgetExceeded: boolean}

type TestCaseEvaluator<Rec extends {}> =
  (testCase: BoundTestCase<Rec>, state: ExplorationState) => PropertyEvaluation

/**
 * Interface for exploring the search space of a property test scenario.
 *
 * The Explorer separates scenario traversal logic from the FluentCheck chain,
 * enabling:
 * - Alternative exploration strategies (e.g., tuple sampling, adaptive search)
 * - Cleaner separation between scenario definition and execution
 * - Better testability of exploration logic
 *
 * @typeParam Rec - The record type of bound variables in the scenario
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
 * Nested loop explorer implementing the traditional property testing approach.
 *
 * This explorer iterates through all combinations of quantifier values using
 * nested loops, matching the current FluentCheck behavior:
 * - For `forall`: iterates all samples, fails on first counterexample
 * - For `exists`: searches for a witness that satisfies the property
 *
 * The explorer is stateless - each call to `explore()` is independent.
 */
export class NestedLoopExplorer<Rec extends {}> implements Explorer<Rec> {
  /**
   * Explores the search space using nested iteration.
   */
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec> {
    const executableScenario = this.#toExecutableScenario(scenario)
    const quantifiers = executableScenario.quantifiers
    const samples = this.#generateSamples(quantifiers, sampler, budget.maxTests)
    const evaluator = this.#createEvaluator(executableScenario.nodes, property)

    const state: ExplorationState = {
      testsRun: 0,
      skipped: 0,
      budgetExceeded: false,
      startTime: Date.now()
    }

    const traverse = (
      quantifierIndex: number,
      testCase: BoundTestCase<Rec>
    ): TraversalOutcome<Rec> => {
      if (this.#isOutOfBudget(budget, state)) {
        return {kind: 'inconclusive', budgetExceeded: true}
      }

      if (quantifierIndex >= quantifiers.length) {
        const evaluation = evaluator(testCase, state)

        if (evaluation === 'passed') {
          return {kind: 'pass', witness: {...testCase}}
        }

        if (evaluation === 'failed') {
          return {kind: 'fail', counterexample: {...testCase}}
        }

        return {kind: 'inconclusive', budgetExceeded: false}
      }

      const quantifier = quantifiers[quantifierIndex]
      if (quantifier === undefined) {
        return {kind: 'inconclusive', budgetExceeded: false}
      }

      if (quantifier.type === 'exists') {
        return this.#handleExists(
          quantifierIndex,
          testCase,
          quantifiers,
          samples,
          evaluator,
          state,
          traverse
        )
      }

      return this.#handleForall(
        quantifierIndex,
        testCase,
        quantifiers,
        samples,
        state,
        traverse
      )
    }

    const outcome = traverse(0, {} as BoundTestCase<Rec>)

    if (outcome.kind === 'pass') {
      return {
        outcome: 'passed',
        testsRun: state.testsRun,
        skipped: state.skipped,
        ...(outcome.witness !== undefined ? {witness: outcome.witness} : {})
      }
    }

    if (outcome.kind === 'fail') {
      return {
        outcome: 'failed',
        counterexample: outcome.counterexample,
        testsRun: state.testsRun,
        skipped: state.skipped
      }
    }

    if (state.budgetExceeded || executableScenario.hasExistential || outcome.budgetExceeded) {
      return {
        outcome: 'exhausted',
        testsRun: state.testsRun,
        skipped: state.skipped
      }
    }

    return {
      outcome: 'passed',
      testsRun: state.testsRun,
      skipped: state.skipped
    }
  }

  #handleExists(
    quantifierIndex: number,
    testCase: BoundTestCase<Rec>,
    quantifiers: readonly ExecutableQuantifier[],
    samples: Map<string, FluentPick<unknown>[]>,
    evaluator: TestCaseEvaluator<Rec>,
    state: ExplorationState,
    traverse: (
      quantifierIndex: number,
      testCase: BoundTestCase<Rec>
    ) => TraversalOutcome<Rec>
  ): TraversalOutcome<Rec> {
    const quantifier = quantifiers[quantifierIndex]
    if (quantifier === undefined) {
      return {kind: 'inconclusive', budgetExceeded: false}
    }

    const quantifierSamples = samples.get(quantifier.name) ?? []
    let sawBudgetLimit = false

    for (const sample of quantifierSamples) {
      const newTestCase = {
        ...testCase,
        [quantifier.name]: sample
      } as BoundTestCase<Rec>

      const outcome = traverse(quantifierIndex + 1, newTestCase)

      if (outcome.kind === 'pass') {
        return {kind: 'pass', witness: outcome.witness ?? newTestCase}
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

    if (sawBudgetLimit) {
      return {kind: 'inconclusive', budgetExceeded: true}
    }

    return {kind: 'inconclusive', budgetExceeded: false}
  }

  #handleForall(
    quantifierIndex: number,
    testCase: BoundTestCase<Rec>,
    quantifiers: readonly ExecutableQuantifier[],
    samples: Map<string, FluentPick<unknown>[]>,
    state: ExplorationState,
    traverse: (
      quantifierIndex: number,
      testCase: BoundTestCase<Rec>
    ) => TraversalOutcome<Rec>
  ): TraversalOutcome<Rec> {
    const quantifier = quantifiers[quantifierIndex]
    if (quantifier === undefined) {
      return {kind: 'inconclusive', budgetExceeded: false}
    }

    const quantifierSamples = samples.get(quantifier.name) ?? []
    const hasInnerExists = this.#hasInnerExistential(quantifiers, quantifierIndex + 1)

    let allPassed = true
    let lastWitness: BoundTestCase<Rec> | undefined
    let sawBudgetLimit = false

    for (const sample of quantifierSamples) {
      const newTestCase = {
        ...testCase,
        [quantifier.name]: sample
      } as BoundTestCase<Rec>

      const outcome = traverse(quantifierIndex + 1, newTestCase)

      if (outcome.kind === 'fail') {
        return {kind: 'fail', counterexample: outcome.counterexample}
      }

      if (outcome.kind === 'pass') {
        if (outcome.witness !== undefined) {
          lastWitness = outcome.witness
        }
        continue
      }

      if (outcome.kind === 'inconclusive') {
        if (outcome.budgetExceeded) {
          sawBudgetLimit = true
          allPassed = false
          break
        }

        if (hasInnerExists) {
          return {kind: 'fail', counterexample: newTestCase}
        }
        allPassed = false
      }
    }

    if (allPassed && quantifierSamples.length > 0) {
      return {
        kind: 'pass',
        ...(lastWitness !== undefined ? {witness: lastWitness} : {})
      }
    }

    if (sawBudgetLimit) {
      return {kind: 'inconclusive', budgetExceeded: true}
    }

    return {kind: 'inconclusive', budgetExceeded: false}
  }

  /**
   * Generate samples for each quantifier.
   */
  #generateSamples(
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

  #toExecutableScenario(scenario: ExecutableScenario<Rec> | Scenario<Rec>): ExecutableScenario<Rec> {
    return this.#isExecutableScenario(scenario)
      ? scenario
      : createExecutableScenario(scenario)
  }

  #isExecutableScenario(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>
  ): scenario is ExecutableScenario<Rec> {
    const q = scenario.quantifiers[0] as ExecutableQuantifier | undefined
    return typeof q?.sample === 'function' && typeof q?.shrink === 'function'
  }

  /**
   * Evaluate the property for a fully bound test case while tracking skips.
   */
  #createEvaluator(
    nodes: readonly ScenarioNode<Rec>[],
    property: (testCase: Rec) => boolean
  ): TestCaseEvaluator<Rec> {
    const hasThenNodes = nodes.some(node => node.type === 'then')

    if (!hasThenNodes) {
      return (testCase: BoundTestCase<Rec>, state: ExplorationState) => {
        state.testsRun += 1
        try {
          return property(this.#unwrapTestCase(testCase)) ? 'passed' : 'failed'
        } catch (e) {
          if (this.#isPreconditionFailure(e)) {
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
        return this.#evaluateScenarioNodes(testCase, nodes) ? 'passed' : 'failed'
      } catch (e) {
        if (this.#isPreconditionFailure(e)) {
          state.skipped += 1
          return 'skipped'
        }
        throw e
      }
    }
  }

  #evaluateScenarioNodes(
    testCase: BoundTestCase<Rec>,
    nodes: readonly ScenarioNode<Rec>[]
  ): boolean {
    const values: Record<string, unknown> = {...this.#unwrapTestCase(testCase)}

    for (const node of nodes) {
      switch (node.type) {
        case 'forall':
        case 'exists':
          break
        case 'given':
          if (node.isFactory) {
            const factory = node.predicate as (args: Rec) => unknown
            values[node.name] = factory(values as Rec)
          } else {
            values[node.name] = node.predicate
          }
          break
        case 'when':
          node.predicate(values as Rec)
          break
        case 'then':
          if (!node.predicate(values as Rec)) {
            return false
          }
          break
      }
    }

    return true
  }

  #unwrapTestCase(testCase: BoundTestCase<Rec>): Rec {
    const values = Object.entries(testCase).map(
      ([key, pick]) => [key, (pick as FluentPick<unknown>).value] as const
    )
    return Object.fromEntries(values) as Rec
  }

  #isOutOfBudget(budget: ExplorationBudget, state: ExplorationState): boolean {
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

  #hasInnerExistential(
    quantifiers: readonly ExecutableQuantifier[],
    startIndex: number
  ): boolean {
    return quantifiers.slice(startIndex).some(q => q.type === 'exists')
  }

  /**
   * Check if an error is a PreconditionFailure.
   */
  #isPreconditionFailure(e: unknown): e is PreconditionFailure {
    return e instanceof PreconditionFailure
  }
}

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}

export type {BoundTestCase} from './types.js'
