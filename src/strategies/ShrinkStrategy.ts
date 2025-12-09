import type {Arbitrary, FluentPick} from '../arbitraries/index.js'
import type {Sampler} from './Sampler.js'

/**
 * Strategy for shrinking counterexamples to minimal forms.
 *
 * When a property fails, shrinking attempts to find the simplest
 * input that still causes the failure, making debugging easier.
 */
export interface ShrinkStrategy {
  /**
   * Generates shrunken samples from a counterexample.
   *
   * @param arbitrary - The base arbitrary to shrink
   * @param counterexample - The failing example to shrink from
   * @param sampler - Sampler to use for generating shrunken values
   * @param shrinkSize - Maximum number of shrunken samples to generate
   * @returns Array of potentially simpler values
   */
  shrink<T>(
    arbitrary: Arbitrary<T>,
    counterexample: FluentPick<T>,
    sampler: Sampler,
    shrinkSize: number
  ): FluentPick<T>[]
}

/**
 * Standard shrinking strategy using the arbitrary's shrink method.
 *
 * Delegates to the arbitrary's built-in shrinking logic, which
 * generates progressively simpler values toward a "minimal" form.
 */
export class StandardShrinkStrategy implements ShrinkStrategy {
  shrink<T>(
    arbitrary: Arbitrary<T>,
    counterexample: FluentPick<T>,
    sampler: Sampler,
    shrinkSize: number
  ): FluentPick<T>[] {
    const shrunkenArbitrary = arbitrary.shrink(counterexample)
    return sampler.sample(shrunkenArbitrary, shrinkSize)
  }
}

/**
 * No-op shrinking strategy that performs no shrinking.
 *
 * Used when shrinking is disabled for faster test execution
 * at the cost of less informative counterexamples.
 */
export class NoShrinkStrategy implements ShrinkStrategy {
  shrink<T>(
    _arbitrary: Arbitrary<T>,
    _counterexample: FluentPick<T>,
    _sampler: Sampler,
    _shrinkSize: number
  ): FluentPick<T>[] {
    return []
  }
}
