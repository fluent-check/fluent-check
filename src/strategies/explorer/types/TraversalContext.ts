import type {FluentPick} from '../../../arbitraries/index.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../../../ExecutableScenario.js'
import type {StatisticsContext} from '../../../statistics.js'
import type {BoundTestCase} from '../../types.js'
import type {ExplorationBudget} from './ExplorationBudget.js'
import type {ExplorationState} from './ExplorationState.js'
import type {TraversalOutcomeBuilder} from '../builders/TraversalOutcomeBuilder.js'
import type {ExplorationResultBuilder} from '../builders/ExplorationResultBuilder.js'

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

export type PropertyEvaluation = 'passed' | 'failed' | 'skipped'

export type TestCaseEvaluator<Rec extends {}> =
  (testCase: BoundTestCase<Rec>, state: ExplorationState) => PropertyEvaluation

/**
 * Context passed through traversal.
 */
export interface TraversalContext<Rec extends {}> {
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

/**
 * Outcome of a single traversal step.
 */
export type TraversalOutcome<Rec extends {}> =
  | {kind: 'pass'; witness?: BoundTestCase<Rec>}
  | {kind: 'fail'; counterexample: BoundTestCase<Rec>}
  | {kind: 'inconclusive'; budgetExceeded: boolean}

/**
 * Function type for traversal continuation.
 */
export type TraverseNext<Rec extends {}> = (
  quantifierIndex: number,
  testCase: BoundTestCase<Rec>,
  ctx: TraversalContext<Rec>
) => TraversalOutcome<Rec>

/**
 * Frame of context for a single quantifier during traversal.
 */
export interface QuantifierFrame<Rec extends {}> {
  readonly index: number
  readonly quantifier: ExecutableQuantifier
  readonly testCase: BoundTestCase<Rec>
  readonly ctx: TraversalContext<Rec>
}

/**
 * Semantics for quantifier handling.
 */
export interface QuantifierSemantics<Rec extends {}> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
}
