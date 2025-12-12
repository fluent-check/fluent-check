/**
 * Execution time breakdown for statistics.
 */
export interface ExecutionTimeBreakdown {
  readonly exploration: number
  readonly shrinking: number
}

/**
 * Result of an operation with timing.
 */
export interface TimedResult<T> {
  readonly result: T
  readonly timeMs: number
}

/**
 * Execute a function and measure its execution time.
 */
export function withTiming<T>(fn: () => T): TimedResult<T> {
  const start = Date.now()
  const result = fn()
  return {result, timeMs: Date.now() - start}
}
