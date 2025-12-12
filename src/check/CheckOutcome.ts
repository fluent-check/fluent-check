import type {StatisticsAggregationInput} from '../statisticsAggregator.js'

/**
 * Outcome of check() after exploration and optional shrinking.
 *
 * Each variant carries:
 * - `kind`: discriminant for exhaustive switching
 * - `satisfiable`: whether the property held
 * - `example`: the witness or counterexample (typed as Rec)
 * - `statisticsInput`: pre-built input for the aggregator
 */
export type CheckOutcome<Rec extends {}> =
  | ForallPassOutcome<Rec>
  | ExistsPassOutcome<Rec>
  | ExhaustedOutcome<Rec>
  | FailedOutcome<Rec>

interface BaseOutcome<Rec extends {}> {
  readonly satisfiable: boolean
  readonly example: Rec
  readonly statisticsInput: StatisticsAggregationInput
}

export interface ForallPassOutcome<Rec extends {}> extends BaseOutcome<Rec> {
  readonly kind: 'forall-pass'
  readonly satisfiable: true
  readonly example: Rec
}

export interface ExistsPassOutcome<Rec extends {}> extends BaseOutcome<Rec> {
  readonly kind: 'exists-pass'
  readonly satisfiable: true
  readonly example: Rec
}

export interface ExhaustedOutcome<Rec extends {}> extends BaseOutcome<Rec> {
  readonly kind: 'exhausted'
  // satisfiable depends on hasExistential
  readonly example: Rec
}

export interface FailedOutcome<Rec extends {}> extends BaseOutcome<Rec> {
  readonly kind: 'failed'
  readonly satisfiable: false
  readonly example: Rec
}
