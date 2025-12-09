import {FluentRandomGenerator} from '../arbitraries/index.js'
import {FluentStrategy, type FluentConfig} from './FluentStrategy.js'
import type {StrategyBindings} from './FluentStrategyTypes.js'
import {RandomSampler, BiasedSampler, CachedSampler, DedupingSampler, type Sampler} from './Sampler.js'
import {SequentialExecutionStrategy, type ExecutionStrategy} from './ExecutionStrategy.js'
import {StandardShrinkStrategy, NoShrinkStrategy, type ShrinkStrategy} from './ShrinkStrategy.js'

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
    this.enableShrinking = true
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
