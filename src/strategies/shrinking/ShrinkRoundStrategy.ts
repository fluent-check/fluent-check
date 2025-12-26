import type {ExecutableQuantifier} from '../../ExecutableScenario.js'

/**
 * Strategy for controlling how quantifiers are shrunk within a single round.
 *
 * Different strategies trade off between fairness and performance:
 * - Sequential Exhaustive: Fast but biased toward first quantifiers
 * - Round-Robin: Balanced fairness with minimal overhead (~5%)
 * - Delta Debugging: Maximum fairness but higher overhead (~60%)
 */
export interface ShrinkRoundStrategy {
  /**
   * Executes one round of shrinking across multiple quantifiers.
   *
   * @param quantifiers - The quantifiers to shrink
   * @param shrinkQuantifier - Function that attempts to shrink a single quantifier.
   *                          Returns true if a smaller value was found.
   *                          This function handles budget checking internally and will
   *                          return false when the budget is exhausted.
   * @returns true if any quantifier was successfully shrunk this round
   */
  shrinkRound(
    quantifiers: readonly ExecutableQuantifier[],
    shrinkQuantifier: (q: ExecutableQuantifier) => boolean
  ): boolean
}
