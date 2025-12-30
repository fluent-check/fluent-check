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

  /**
   * Optional target confidence level (0-1) for early termination.
   * When this confidence is reached, exploration will terminate early.
   */
  readonly targetConfidence?: number

  /**
   * Optional minimum confidence level (0-1) before stopping.
   * If maxTests is reached but confidence is below this threshold,
   * exploration will continue until confidence is met (up to maxIterations).
   */
  readonly minConfidence?: number

  /**
   * Optional maximum number of iterations as a safety upper bound.
   * Prevents infinite loops when using confidence-based termination.
   */
  readonly maxIterations?: number

  /**
   * Optional pass-rate threshold for confidence calculation (default 0.999).
   * Used to calculate: confidence = P(pass_rate > passRateThreshold | data)
   */
  readonly passRateThreshold?: number

  /**
   * Optional interval (in tests) between confidence checks (default 100).
   * Smaller intervals are more responsive but have higher computational cost.
   */
  readonly confidenceCheckInterval?: number
}
