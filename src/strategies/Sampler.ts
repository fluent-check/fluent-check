import type {Arbitrary, FluentPick} from '../arbitraries/index.js'
import {FluentRandomGenerator} from '../arbitraries/index.js'

const uniqueWithBias = <A>(arbitrary: Arbitrary<A>, count: number, generator: () => number) =>
  arbitrary.sampleUniqueWithBias(count, generator)

const resolveGenerator = (config: SamplerConfig = {}): (() => number) => {
  if (config.generator !== undefined) return config.generator
  if (config.rngBuilder !== undefined && config.seed !== undefined) {
    return new FluentRandomGenerator(config.rngBuilder, config.seed).generator
  }
  return Math.random
}

/**
 * Configuration for a Sampler instance.
 */
export interface SamplerConfig {
  /**
   * Random number generator function.
   * Defaults to Math.random if not provided.
   */
  generator?: () => number
  /**
   * RNG builder function for creating new generators with seeds.
   * Used when creating new sampler instances.
   */
  rngBuilder?: (seed: number) => () => number
  /**
   * Seed for random number generation.
   * Used with rngBuilder to create deterministic generators.
   */
  seed?: number
}

/**
 * Interface for sampling values from arbitraries.
 *
 * The Sampler interface separates the concern of value generation from
 * execution control and shrinking logic, enabling cleaner composition
 * and better testability.
 */
export interface Sampler {
  /**
   * Samples values from an arbitrary.
   *
   * @param arbitrary - The arbitrary to sample from
   * @param count - Maximum number of samples to generate
   * @returns Array of sampled values (length <= count)
   */
  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]

  /**
   * Samples values with bias toward corner cases.
   *
   * @param arbitrary - The arbitrary to sample from
   * @param count - Maximum number of samples to generate
   * @returns Array of sampled values including corner cases
   */
  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]

  /**
   * Samples unique values from an arbitrary.
   *
   * @param arbitrary - The arbitrary to sample from
   * @param count - Maximum number of unique samples to generate
   * @returns Array of unique sampled values
   */
  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]

  /**
   * Gets the random number generator function used by this sampler.
   * Used by decorators that need to pass the generator to arbitrary methods.
   *
   * @returns The generator function
   */
  getGenerator(): () => number
}

/**
 * Base implementation of Sampler using random generation.
 *
 * This is the default sampler that performs basic random sampling
 * from arbitraries without any special behavior like caching or bias.
 */
export class RandomSampler implements Sampler {
  private readonly generator: () => number

  constructor(config: SamplerConfig = {}) {
    this.generator = resolveGenerator(config)
  }

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sample(count, this.generator)
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sampleWithBias(count, this.generator)
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sampleUnique(count, [], this.generator)
  }

  getGenerator(): () => number {
    return this.generator
  }
}

/**
 * Decorator that adds bias toward corner cases to another sampler.
 *
 * When sampling, this decorator prioritizes corner cases from the arbitrary
 * before generating random samples.
 */
export class BiasedSampler implements Sampler {
  /**
   * Creates a new BiasedSampler that wraps another sampler.
   *
   * @param baseSampler - The sampler to wrap
   */
  constructor(private readonly baseSampler: Sampler) {}

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleWithBias(arbitrary, count)
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleWithBias(arbitrary, count)
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return uniqueWithBias(arbitrary, count, this.baseSampler.getGenerator())
  }

  getGenerator(): () => number {
    return this.baseSampler.getGenerator()
  }
}

/**
 * Decorator that caches samples from an arbitrary.
 *
 * When the same arbitrary is sampled multiple times, this decorator
 * returns the cached result instead of generating new samples.
 */
export class CachedSampler implements Sampler {
  private readonly cache = new Map<Arbitrary<unknown>, FluentPick<unknown>[]>()

  /**
   * Creates a new CachedSampler that wraps another sampler.
   *
   * @param baseSampler - The sampler to wrap
   */
  constructor(private readonly baseSampler: Sampler) {}

  /**
   * Helper method that implements the common caching logic for all sample methods.
   *
   * @param arbitrary - The arbitrary to sample from
   * @param count - Maximum number of samples to generate
   * @param sampleFn - Function to call on the base sampler if not cached
   * @returns Array of sampled values
   */
  private sampleAndCache<A>(
    arbitrary: Arbitrary<A>,
    count: number,
    sampleFn: () => FluentPick<A>[]
  ): FluentPick<A>[] {
    const cached = this.cache.get(arbitrary as Arbitrary<unknown>)
    if (cached !== undefined && cached.length >= count) {
      return cached.slice(0, count) as FluentPick<A>[]
    }
    const samples = sampleFn()
    this.cache.set(arbitrary as Arbitrary<unknown>, samples as FluentPick<unknown>[])
    return samples
  }

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.sampleAndCache(arbitrary, count, () => this.baseSampler.sample(arbitrary, count))
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.sampleAndCache(arbitrary, count, () => this.baseSampler.sampleWithBias(arbitrary, count))
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.sampleAndCache(arbitrary, count, () => this.baseSampler.sampleUnique(arbitrary, count))
  }

  getGenerator(): () => number {
    return this.baseSampler.getGenerator()
  }
}

/**
 * Decorator that ensures unique samples.
 *
 * This decorator filters out duplicate values when sampling,
 * using the arbitrary's equals function to determine uniqueness.
 */
export class DedupingSampler implements Sampler {
  /**
   * Creates a new DedupingSampler that wraps another sampler.
   *
   * @param baseSampler - The sampler to wrap
   */
  constructor(private readonly baseSampler: Sampler) {}

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleUnique(arbitrary, count)
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return uniqueWithBias(arbitrary, count, this.baseSampler.getGenerator())
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleUnique(arbitrary, count)
  }

  getGenerator(): () => number {
    return this.baseSampler.getGenerator()
  }
}
