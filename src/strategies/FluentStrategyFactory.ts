import {FluentRandomGenerator} from '../arbitraries/index.js'
import {FluentStrategy, type FluentConfig} from './FluentStrategy.js'
import type {StrategyBindings} from './FluentStrategyTypes.js'
import {RandomSampler, BiasedSampler, CachedSampler, DedupingSampler, type Sampler} from './Sampler.js'
import {SequentialExecutionStrategy, type ExecutionStrategy} from './ExecutionStrategy.js'
import {StandardShrinkStrategy, NoShrinkStrategy, type ShrinkStrategy} from './ShrinkStrategy.js'
import {NestedLoopExplorer, type Explorer} from './Explorer.js'
import {PerArbitraryShrinker, NoOpShrinker, type Shrinker, type ShrinkBudget} from './Shrinker.js'
import {Verbosity} from '../statistics.js'

export class FluentStrategyFactory<Rec extends StrategyBindings = StrategyBindings> {

  /**
   * Strategy configuration
   */
  public configuration: FluentConfig = {sampleSize: 1000}

  /**
   * Sampler composition flags
   */
  private samplerConfig = {
    deduping: false,
    biased: false,
    cached: false
  }

  /**
   * Whether shrinking is enabled
   */
  private enableShrinking = false

  /**
   * RNG configuration for deterministic generation
   */
  private rngBuilder: (seed: number) => () => number = (_: number) => Math.random
  private rngSeed: number = Math.floor(Math.random() * 0x100000000)

  /**
   * Explorer factory function for creating explorers.
   * Defaults to NestedLoopExplorer.
   */
  private explorerFactory: <R extends StrategyBindings>() => Explorer<R> =
    <R extends StrategyBindings>() => new NestedLoopExplorer<R>()

  /**
   * Shrinker factory function for creating shrinkers.
   * Defaults to NoOpShrinker (shrinking disabled until explicitly enabled).
   */
  private shrinkerFactory: <R extends StrategyBindings>() => Shrinker<R> =
    <R extends StrategyBindings>() => new NoOpShrinker<R>()

  /**
   * Whether detailed statistics collection is enabled.
   */
  private detailedStatistics = false

  /**
   * Verbosity level for output.
   */
  private verbosity: Verbosity = Verbosity.Normal

  /**
   * Changes the sample size to be used while sampling test cases.
   */
  withSampleSize(sampleSize: number) {
    this.configuration = {...this.configuration, sampleSize}
    return this
  }

  /**
   * Configures a custom random number generator.
   *
   * @param builder - Function that creates an RNG from a seed
   * @param seed - Optional seed value (random if not provided)
   */
  withRandomGenerator(builder: (seed: number) => () => number, seed?: number) {
    this.rngBuilder = builder
    if (seed !== undefined) {
      this.rngSeed = seed
    }
    return this
  }

  /**
   * Enables sampling without replacement, which avoids testing duplicate test cases.
   */
  withoutReplacement() {
    this.samplerConfig.deduping = true
    return this
  }

  /**
   * Sampling considers corner cases.
   */
  withBias() {
    this.samplerConfig.biased = true
    return this
  }

  /**
   * Caches the generated samples to avoid being constantly generating new samples.
   */
  usingCache() {
    this.samplerConfig.cached = true
    return this
  }

  /**
   * Randomly generates test cases.
   */
  withRandomSampling() {
    // This is the default - no-op for now, but kept for API compatibility
    return this
  }

  /**
   * Enables shrinking. It is also possible to configure the shrinking size, which by default is 500.
   */
  withShrinking(shrinkSize = 500) {
    this.configuration = {...this.configuration, shrinkSize}
    this.enableShrinking = true
    this.shrinkerFactory = <R extends StrategyBindings>() => new PerArbitraryShrinker<R>()
    return this
  }

  /**
   * Disables shrinking (useful for faster test execution).
   */
  withoutShrinking() {
    this.enableShrinking = false
    this.shrinkerFactory = <R extends StrategyBindings>() => new NoOpShrinker<R>()
    return this
  }

  /**
   * Configures per-arbitrary shrinking (current default when shrinking is enabled).
   * Each quantifier's value is shrunk independently.
   */
  withPerArbitraryShrinking(shrinkSize = 500) {
    return this.withShrinking(shrinkSize)
  }

  /**
   * Enables detailed statistics collection.
   * When enabled, per-arbitrary statistics, distribution tracking, and enhanced metrics are collected.
   *
   * @returns This factory for method chaining
   */
  withDetailedStatistics(): this {
    this.detailedStatistics = true
    return this
  }

  /**
   * Sets the verbosity level for test output.
   *
   * @param level - The verbosity level (Quiet, Normal, Verbose, or Debug)
   * @returns This factory for method chaining
   */
  withVerbosity(level: Verbosity): this {
    this.verbosity = level
    return this
  }

  /**
   * Gets whether detailed statistics are enabled.
   */
  getDetailedStatistics(): boolean {
    return this.detailedStatistics
  }

  /**
   * Gets the current verbosity level.
   */
  getVerbosity(): Verbosity {
    return this.verbosity
  }

  /**
   * Configures a custom shrinker factory.
   *
   * @param factory - Function that creates a Shrinker instance
   */
  withShrinker(factory: <R extends StrategyBindings>() => Shrinker<R>) {
    this.shrinkerFactory = factory
    this.enableShrinking = true
    return this
  }

  /**
   * Configures the factory to use nested loop exploration (default).
   *
   * This is the traditional property testing approach that iterates through
   * all combinations using nested loops. It's the default explorer, so calling
   * this method is optional unless you want to reset after using a different explorer.
   */
  withNestedExploration() {
    this.explorerFactory = <R extends StrategyBindings>() => new NestedLoopExplorer<R>()
    return this
  }

  /**
   * Configures a custom explorer factory.
   *
   * @param factory - Function that creates an Explorer instance
   */
  withExplorer(factory: <R extends StrategyBindings>() => Explorer<R>) {
    this.explorerFactory = factory
    return this
  }

  /**
   * Default strategy composition.
   */
  defaultStrategy() {
    this.configuration = {...this.configuration, shrinkSize: 500}
    this.samplerConfig = {
      deduping: true,
      biased: true,
      cached: true
    }
    // Default to full shrinking behavior (matches pre-refactor defaults)
    this.withPerArbitraryShrinking(this.configuration.shrinkSize)
    return this
  }

  /**
   * Builds a sampler based on the configured flags.
   */
  private buildSampler(randomGenerator: FluentRandomGenerator): Sampler {
    let sampler: Sampler = new RandomSampler({generator: randomGenerator.generator})

    // Apply decorators in order: deduping -> biased -> cached
    // This matches the order in defaultStrategy: Cached(Biased(Dedupable(Random(...))))
    if (this.samplerConfig.deduping) {
      sampler = new DedupingSampler(sampler)
    }
    if (this.samplerConfig.biased) {
      sampler = new BiasedSampler(sampler)
    }
    if (this.samplerConfig.cached) {
      sampler = new CachedSampler(sampler)
    }

    return sampler
  }

  /**
   * Builds the random generator based on configuration.
   */
  private buildRandomGenerator(): FluentRandomGenerator {
    return new FluentRandomGenerator(this.rngBuilder, this.rngSeed)
  }

  /**
   * Builds an execution strategy.
   * Currently only one implementation exists (sequential execution).
   */
  private buildExecutionStrategy(): ExecutionStrategy {
    return new SequentialExecutionStrategy()
  }

  /**
   * Builds a shrink strategy based on configuration.
   */
  private buildShrinkStrategy(): ShrinkStrategy {
    return this.enableShrinking
      ? new StandardShrinkStrategy()
      : new NoShrinkStrategy()
  }

  /**
   * Builds an explorer based on configuration.
   */
  buildExplorer(): Explorer<Rec> {
    return this.explorerFactory<Rec>()
  }

  /**
   * Builds a shrinker based on configuration.
   */
  buildShrinker(): Shrinker<Rec> {
    return this.shrinkerFactory<Rec>()
  }

  /**
   * Builds the shrink budget based on configuration.
   */
  buildShrinkBudget(): ShrinkBudget {
    const shrinkSize = this.configuration.shrinkSize ?? 500
    return {
      maxAttempts: shrinkSize,
      // Allow up to one successful shrink per attempt; avoids stopping early on large candidates
      maxRounds: shrinkSize
    }
  }

  /**
   * Builds a sampler with a new random generator.
   * Useful for standalone explorer usage.
   */
  buildStandaloneSampler(): { sampler: Sampler; randomGenerator: FluentRandomGenerator } {
    const randomGenerator = this.buildRandomGenerator()
    return {
      sampler: this.buildSampler(randomGenerator),
      randomGenerator
    }
  }

  /**
   * Builds and returns the FluentStrategy with a specified configuration.
   */
  build(): FluentStrategy<Rec> {
    // Build RNG first - single source of truth for randomness
    const randomGenerator = this.buildRandomGenerator()

    // Create strategy with all components initialized from the same RNG
    return new FluentStrategy<Rec>(
      this.configuration,
      randomGenerator,
      this.buildSampler(randomGenerator),
      this.buildExecutionStrategy(),
      this.buildShrinkStrategy()
    )
  }

}
