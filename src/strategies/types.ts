import type {FluentPick} from '../arbitraries/index.js'

/**
 * Common representation of a test case with bound FluentPick values.
 * Shared between explorer and shrinker to avoid duplication and casts.
 */
export type BoundTestCase<Rec extends {}> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

/**
 * Shrinking strategy selection.
 *
 * Different strategies trade off between fairness and performance:
 *
 * - `'sequential-exhaustive'`: Legacy behavior (default for backward compatibility)
 *   - Fairness: Poor — exhibits strong position-based bias (variance = 2074)
 *   - Performance: Fastest (baseline)
 *   - Use when: Backward compatibility is required
 *
 * - `'round-robin'`: Recommended default
 *   - Fairness: Good — 73% variance reduction (variance = 554)
 *   - Performance: ~5% overhead (negligible)
 *   - Use when: You want balanced shrinking with minimal performance cost
 *
 * - `'delta-debugging'`: Maximum quality
 *   - Fairness: Excellent — 97% variance reduction (variance = 63)
 *   - Performance: ~60% overhead
 *   - Use when: Maximum shrinking quality is needed and performance is less critical
 */
export type ShrinkingStrategy = 'sequential-exhaustive' | 'round-robin' | 'delta-debugging'
