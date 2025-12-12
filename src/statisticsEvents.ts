import {getCurrentStatisticsContext} from './statistics.js'

/**
 * Record an event during property evaluation.
 * Events are tracked per test case (multiple calls with the same name in one test case count as one).
 *
 * @param name - Event identifier
 *
 * @example
 * ```typescript
 * fc.scenario()
 *   .forall('x', fc.integer())
 *   .then(({x}) => {
 *     if (x > 1000) fc.event('large value')
 *     return x * x >= 0
 *   })
 *   .check()
 * ```
 */
export function event(name: string, payload?: unknown): void {
  const context = getCurrentStatisticsContext()
  if (context === undefined) {
    throw new Error('fc.event() can only be called within a property function (.then() callback)')
  }
  const testCaseIndex = context.getTestCaseIndex()
  context.recordEvent(name, testCaseIndex, payload)
}

/**
 * Record a target observation for coverage-guided optimization.
 * The explorer may use these observations to guide generation toward higher values.
 *
 * @param observation - A finite number to maximize (not NaN, not Infinity)
 * @param label - Optional label to distinguish multiple targets (defaults to "default")
 *
 * @example
 * ```typescript
 * fc.scenario()
 *   .forall('xs', fc.array(fc.integer()))
 *   .then(({xs}) => {
 *     fc.target(xs.length, 'array length')
 *     return isSorted(sort(xs))
 *   })
 *   .check()
 * ```
 */
export function target(observation: number, label = 'default'): void {
  const context = getCurrentStatisticsContext()
  if (context === undefined) {
    throw new Error('fc.target() can only be called within a property function (.then() callback)')
  }
  if (!Number.isFinite(observation)) {
    context.logInvalidTarget(label, observation)
    return
  }
  context.recordTarget(label, observation)
}
