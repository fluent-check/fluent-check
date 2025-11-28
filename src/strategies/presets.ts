import {FluentStrategyFactory} from './FluentStrategyFactory.js'

/**
 * Pre-configured strategy presets for common testing scenarios.
 *
 * Each preset returns a fresh `FluentStrategyFactory` instance that can be
 * passed to `config()` on scenarios or properties. Using getters ensures
 * that each access returns a new factory, preventing accidental state sharing.
 *
 * @example
 * ```typescript
 * import * as fc from 'fluent-check';
 *
 * // Using with scenario()
 * fc.scenario()
 *   .config(fc.strategies.thorough)
 *   .forall('x', fc.integer())
 *   .then(({ x }) => x + 0 === x)
 *   .check();
 *
 * // Using with prop()
 * fc.prop(fc.integer(), x => x + 0 === x)
 *   .config(fc.strategies.fast)
 *   .assert();
 * ```
 */
export const strategies = {
  /**
   * Default strategy - balanced speed and coverage.
   *
   * Uses the library's default strategy composition which includes:
   * - Random sampling
   * - Deduplication (no duplicate test cases)
   * - Bias toward corner cases
   * - Caching for efficiency
   * - Shrinking for minimal counterexamples
   *
   * **When to use:** General-purpose testing, CI pipelines, most property tests.
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategies.default)
   *   .forall('x', fc.integer())
   *   .then(({ x }) => x + 0 === x)
   *   .check();
   * ```
   */
  get default(): FluentStrategyFactory {
    return new FluentStrategyFactory().defaultStrategy()
  },

  /**
   * Fast strategy - quick feedback with less thorough coverage.
   *
   * Uses only random sampling without additional features like caching,
   * deduplication, or shrinking. Provides faster execution at the cost
   * of potentially less informative counterexamples.
   *
   * **When to use:** Quick iteration during development, exploratory testing,
   * when speed matters more than coverage.
   *
   * @example
   * ```typescript
   * fc.prop(fc.integer(), x => x >= 0)
   *   .config(fc.strategies.fast)
   *   .assert();
   * ```
   */
  get fast(): FluentStrategyFactory {
    return new FluentStrategyFactory().withRandomSampling()
  },

  /**
   * Thorough strategy - comprehensive coverage with all features enabled.
   *
   * Includes:
   * - Random sampling
   * - Caching for efficient re-runs
   * - Deduplication (no duplicate test cases)
   * - Shrinking for minimal counterexamples
   *
   * **When to use:** Critical code paths, pre-release testing, when finding
   * minimal counterexamples is important.
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategies.thorough)
   *   .forall('list', fc.array(fc.integer()))
   *   .then(({ list }) => isSorted(sort(list)))
   *   .check();
   * ```
   */
  get thorough(): FluentStrategyFactory {
    return new FluentStrategyFactory()
      .withRandomSampling()
      .usingCache()
      .withoutReplacement()
      .withShrinking()
  },

  /**
   * Minimal strategy - for debugging with very few samples.
   *
   * Generates only 10 test cases, useful for debugging test setup
   * or quickly verifying a property works before running full tests.
   * Uses random sampling for basic functionality.
   *
   * **When to use:** Debugging, verifying test setup, interactive exploration.
   *
   * @example
   * ```typescript
   * // Quick sanity check during development
   * fc.prop(fc.integer(), x => x + 0 === x)
   *   .config(fc.strategies.minimal)
   *   .assert();
   * ```
   */
  get minimal(): FluentStrategyFactory {
    return new FluentStrategyFactory().withRandomSampling().withSampleSize(10)
  }
}
