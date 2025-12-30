import type {BoundTestCase} from '../../types.js'
import type {ArbitraryStatistics, TargetStatistics} from '../../../statistics.js'

/**
 * Detailed statistics from exploration (optional).
 */
export interface DetailedExplorationStats {
  /** Per-arbitrary statistics (only when detailed statistics enabled) */
  arbitraryStats?: Record<string, ArbitraryStatistics>
  /** Event counts (if any events were recorded) */
  events?: Record<string, number>
  /** Target statistics (if any targets were recorded) */
  targets?: Record<string, TargetStatistics>
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
