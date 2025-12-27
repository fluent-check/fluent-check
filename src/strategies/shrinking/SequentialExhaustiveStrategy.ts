import type {ExecutableQuantifier} from '../../ExecutableScenario.js'
import type {ShrinkRoundStrategy} from './ShrinkRoundStrategy.js'

/**
 * Sequential exhaustive shrinking strategy (legacy behavior).
 *
 * This strategy iterates through quantifiers in order and immediately restarts
 * from the beginning whenever a successful shrink is found. This creates a bias
 * toward earlier quantifiers in the list.
 *
 * **Fairness**: Poor — exhibits strong position-based bias (variance = 2074)
 * **Performance**: Fastest (baseline)
 * **Recommendation**: Only use for backward compatibility
 *
 * Example behavior for property `forall(a, b, c: int(0,100)).then(a + b + c <= 150)`:
 * - Initial failure: (80, 85, 90)
 * - Round 1: Try a→70 (succeed, restart from a)
 * - Round 2: Try a→60 (succeed, restart from a)
 * - ...
 * - Round N: Try a→0 (succeed, now at (0, 85, 90))
 * - Round N+1: Try a→0 (already minimal, move to b)
 * - Round N+2: Try b→75 (succeed, restart from a)
 * - ...
 * - Final: (0, 70, 81) — heavily biased toward shrinking `a`
 *
 * If we reorder to `forall(c, b, a: ...)`, the same property would shrink to (81, 70, 0).
 * This order-dependence is the root cause of unfairness.
 *
 * Root cause: The `break` statement on line 265 of the original Shrinker.ts
 * causes immediate restart, resulting in lexicographic minimization rather than
 * balanced shrinking.
 */
export class SequentialExhaustiveStrategy implements ShrinkRoundStrategy {
  shrinkRound(
    quantifiers: readonly ExecutableQuantifier[],
    shrinkQuantifier: (q: ExecutableQuantifier) => boolean
  ): boolean {
    // Try quantifiers in order, restarting immediately on success
    for (const quantifier of quantifiers) {
      if (shrinkQuantifier(quantifier)) {
        // Early exit - this is what causes the bias
        return true
      }
    }

    return false
  }
}
