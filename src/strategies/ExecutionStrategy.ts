import type {FluentPick} from '../arbitraries/index.js'
import type {FluentStrategyArbitrary} from './FluentStrategyTypes.js'

/**
 * Strategy for controlling how test case execution proceeds.
 *
 * Separates execution control (iteration, input selection) from
 * sampling concerns (value generation) and shrinking logic.
 */
export interface ExecutionStrategy {
  /**
   * Determines whether there are more inputs to process.
   *
   * @param state - The arbitrary state containing the sample collection
   * @returns true if more inputs are available, false otherwise
   */
  hasInput<T>(state: FluentStrategyArbitrary<T>): boolean

  /**
   * Retrieves the next input from the collection.
   *
   * @param state - The arbitrary state containing the sample collection
   * @returns The next FluentPick value to test
   */
  getInput<T>(state: FluentStrategyArbitrary<T>): FluentPick<T>

  /**
   * Called after each test case execution completes.
   *
   * Can be used for tracking, logging, or other side effects.
   * Most implementations leave this empty.
   */
  handleResult(): void
}

/**
 * Sequential execution strategy that iterates through samples in order.
 *
 * This is the standard execution model: generate a collection of samples,
 * then iterate through them sequentially until exhausted.
 */
export class SequentialExecutionStrategy implements ExecutionStrategy {
  hasInput<T>(state: FluentStrategyArbitrary<T>): boolean {
    const collection = state.collection ?? []
    return state.pickNum < collection.length
  }

  getInput<T>(state: FluentStrategyArbitrary<T>): FluentPick<T> {
    const collection = state.collection ?? []
    const next = collection[state.pickNum]
    if (next === undefined) {
      throw new Error('No input available for SequentialExecutionStrategy')
    }
    state.pickNum += 1
    return next
  }

  handleResult(): void {
    // No-op for sequential execution
  }
}
