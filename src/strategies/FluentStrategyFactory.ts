import {FluentRandomGenerator} from '../arbitraries/index.js'
import {mulberry32} from '../arbitraries/util.js'
import {FluentStrategy, type FluentConfig} from './FluentStrategy.js'
import type {StrategyBindings} from './FluentStrategyTypes.js'
import {RandomSampler, BiasedSampler, CachedSampler, DedupingSampler, type Sampler} from './Sampler.js'
import {SequentialExecutionStrategy, type ExecutionStrategy} from './ExecutionStrategy.js'
import {StandardShrinkStrategy, NoShrinkStrategy, type ShrinkStrategy} from './ShrinkStrategy.js'
import {NestedLoopExplorer, type Explorer} from './Explorer.js'
import {PerArbitraryShrinker, NoOpShrinker, type Shrinker, type ShrinkBudget} from './Shrinker.js'
import {Verbosity} from '../statistics.js'
import type {ShrinkingStrategy} from './types.js'
import {SequentialExhaustiveStrategy} from './shrinking/SequentialExhaustiveStrategy.js'
import {RoundRobinStrategy} from './shrinking/RoundRobinStrategy.js'
import {DeltaDebuggingStrategy} from './shrinking/DeltaDebuggingStrategy.js'

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
   * Shrinking strategy to use
   */
  private shrinkingStrategy: ShrinkingStrategy = 'sequential-exhaustive'

  /**
   * RNG configuration for deterministic generation
   */
  private _rngBuilder: (seed: number) => () => number = mulberry32
  private rngSeed = 0xCAFEBABE

  /**
   * Gets the current random number generator builder.
   */
  public get rngBuilder(): (seed: number) => () => number {
    return this._rngBuilder
  }

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
    this._rngBuilder = builder
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
    this.#updateShrinkerFactory()
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
   * Configures the shrinking strategy to use when shrinking is enabled.
   *
   * Different strategies trade off between fairness and performance:
   *
   * - `'sequential-exhaustive'`: Legacy behavior (default for backward compatibility)
   *   - Fairness: Poor — exhibits strong position-based bias
   *   - Performance: Fastest (baseline)
   *
   * - `'round-robin'`: Recommended default
   *   - Fairness: Good — 73% variance reduction
   *   - Performance: ~5% overhead (negligible)
   *
   * - `'delta-debugging'`: Maximum quality
   *   - Fairness: Excellent — 97% variance reduction
   *   - Performance: ~60% overhead
   *
   * @param strategy - The shrinking strategy to use
   * @returns This factory for method chaining
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withShrinking(500)
   *     .withShrinkingStrategy('round-robin'))
   *   .forall('a', fc.integer(0, 100))
   *   .forall('b', fc.integer(0, 100))
   *   .forall('c', fc.integer(0, 100))
   *   .then(({a, b, c}) => a + b + c <= 150)
   *   .check()
   * ```
   */
  withShrinkingStrategy(strategy: ShrinkingStrategy): this {
    this.shrinkingStrategy = strategy
    // Update factory if shrinking is already enabled
    if (this.enableShrinking) {
      this.#updateShrinkerFactory()
    }
    return this
  }

  #updateShrinkerFactory() {
    // This should only be called when shrinking is enabled
    const strategyInstance = this.#createStrategyInstance(this.shrinkingStrategy)
    
    // For Round-Robin and Delta-Debugging, use a small batch size (1) to ensure fairness.
    // For Sequential, use a large batch size (100) to ensure thorough search.
    const batchSize = this.shrinkingStrategy === 'sequential-exhaustive' ? 100 : 1
    
    this.shrinkerFactory = <R extends StrategyBindings>() =>
      new PerArbitraryShrinker<R>(strategyInstance, batchSize)
  }

  #createStrategyInstance(strategy: ShrinkingStrategy) {
    switch (strategy) {
      case 'sequential-exhaustive':
        return new SequentialExhaustiveStrategy()
      case 'round-robin':
        return new RoundRobinStrategy()
      case 'delta-debugging':
        return new DeltaDebuggingStrategy()
    }
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
   * Sets the target confidence level for early termination.
   * When this confidence is reached, test execution will terminate early.
   *
   * @param level - Target confidence level (0 < level < 1), e.g., 0.99 for 99% confidence
   * @returns This factory for method chaining
   * @throws Error if level is not between 0 and 1
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy().withConfidence(0.99))
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .check()
   * ```
   */
  withConfidence(level: number): this {
    if (level <= 0 || level >= 1) {
      throw new Error(`Confidence level must be between 0 and 1, got ${level}`)
    }
    this.configuration = {...this.configuration, targetConfidence: level}
    return this
  }

  /**
   * Sets the minimum confidence level before stopping.
   * If sample size is reached but confidence is below this threshold,
   * execution will continue until confidence is met (up to maxIterations).
   *
   * @param level - Minimum confidence level (0 < level < 1), e.g., 0.95 for 95% confidence
   * @returns This factory for method chaining
   * @throws Error if level is not between 0 and 1
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withMinConfidence(0.95)
   *     .withSampleSize(1000))
   *   .forall('x', fc.integer())
   *   .then(({x}) => x >= 0)
   *   .check()
   * ```
   */
  withMinConfidence(level: number): this {
    if (level <= 0 || level >= 1) {
      throw new Error(`Confidence level must be between 0 and 1, got ${level}`)
    }
    this.configuration = {...this.configuration, minConfidence: level}
    return this
  }

  /**
   * Sets the maximum number of iterations as a safety upper bound.
   * This prevents infinite loops when using confidence-based termination.
   *
   * @param count - Maximum number of test iterations (must be > 0)
   * @returns This factory for method chaining
   * @throws Error if count is not positive
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withConfidence(0.99)
   *     .withMaxIterations(50000))
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .check()
   * ```
   */
  withMaxIterations(count: number): this {
    if (count <= 0 || !Number.isInteger(count)) {
      throw new Error(`Max iterations must be a positive integer, got ${count}`)
    }
    this.configuration = {...this.configuration, maxIterations: count}
    return this
  }

  /**
   * Sets the pass-rate threshold for confidence calculation.
   * This threshold is used in the Bayesian confidence calculation to determine
   * the confidence that the true pass rate exceeds this threshold.
   *
   * @param threshold - Pass rate threshold (0 < threshold < 1), e.g., 0.999 for 99.9% pass rate
   * @returns This factory for method chaining
   * @throws Error if threshold is not between 0 and 1
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withConfidence(0.95)
   *     .withPassRateThreshold(0.99))  // 95% confident that pass rate > 99%
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .check()
   * ```
   */
  withPassRateThreshold(threshold: number): this {
    if (threshold <= 0 || threshold >= 1) {
      throw new Error(`Pass rate threshold must be between 0 and 1, got ${threshold}`)
    }
    this.configuration = {...this.configuration, passRateThreshold: threshold}
    return this
  }

  /**
   * Sets the interval (in tests) between confidence checks.
   * Smaller intervals are more responsive but have higher computational cost.
   *
   * @param interval - Number of tests between confidence checks (must be >= 1)
   * @returns This factory for method chaining
   * @throws Error if interval is not a positive integer
   *
   * @example
   * ```typescript
   * fc.scenario()
   *   .config(fc.strategy()
   *     .withConfidence(0.95)
   *     .withConfidenceCheckInterval(50))  // Check every 50 tests instead of 100
   *   .forall('x', fc.integer())
   *   .then(({x}) => x * x >= 0)
   *   .check()
   * ```
   */
  withConfidenceCheckInterval(interval: number): this {
    if (interval < 1 || !Number.isInteger(interval)) {
      throw new Error(`Confidence check interval must be a positive integer, got ${interval}`)
    }
    this.configuration = {...this.configuration, confidenceCheckInterval: interval}
    return this
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
    return new FluentRandomGenerator(this._rngBuilder, this.rngSeed)
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
   * Creates a deep clone of this factory with all configuration settings.
   * Useful for preserving factory state when creating modified copies.
   */
  clone(): FluentStrategyFactory<Rec> {
    const cloned = new FluentStrategyFactory<Rec>()

    // Copy public configuration
    cloned.configuration = {...this.configuration}

    // Copy private fields
    cloned.samplerConfig = {...this.samplerConfig}
    cloned.enableShrinking = this.enableShrinking
    cloned.shrinkingStrategy = this.shrinkingStrategy
    cloned._rngBuilder = this._rngBuilder
    cloned.rngSeed = this.rngSeed
    cloned.explorerFactory = this.explorerFactory
    cloned.shrinkerFactory = this.shrinkerFactory
    cloned.detailedStatistics = this.detailedStatistics
    cloned.verbosity = this.verbosity

    return cloned
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
