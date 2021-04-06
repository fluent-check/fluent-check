import {FluentStrategy, FluentConfig} from './FluentStrategy'
import {Biased, Cached, Dedupable, Random, Shrinkable} from './FluentStrategyMixins'

export class FluentStrategyFactory {

  /**
   * Strategy mixin composition
   */
  private strategy = FluentStrategy

  /**
   * Strategy configuration
   */
  public configuration: FluentConfig = {sampleSize: 1000}

  /**
   * Changes the sample size to be used while sampling test cases.
   */
  withSampleSize(sampleSize: number) {
    this.configuration = {...this.configuration, sampleSize}
    return this
  }

  /**
   * Enables sampling without replacement, which avoids testing duplicate test cases.
   */
  withoutReplacement() {
    this.strategy = Dedupable(this.strategy)
    return this
  }

  /**
   * Sampling considers corner cases.
   */
  withBias() {
    this.strategy = Biased(this.strategy)
    return this
  }

  /**
   * Caches the generated samples to avoid being constantly generating new samples.
   */
  usingCache() {
    this.strategy = Cached(this.strategy)
    return this
  }

  /**
   * Randomly generates test cases.
   */
  withRandomSampling() {
    this.strategy = Random(this.strategy)
    return this
  }

  /**
   * Enables shrinking. It is also possible to configure the shrinking size, which by default is 500.
   */
  withShrinking(shrinkSize = 500) {
    this.configuration = {...this.configuration, shrinkSize}
    this.strategy = Shrinkable(this.strategy)
    return this
  }

  /**
   * Default strategy composition.
   */
  defaultStrategy() {
    this.configuration = {...this.configuration, shrinkSize: 500}
    this.strategy = Shrinkable(Cached(Biased(Dedupable(Random(this.strategy)))))
    return this
  }

  /**
   * Builds and returns the FluentStrategy with a specified configuration.
   */
  build(): FluentStrategy {
    return new this.strategy(this.configuration)
  }

}
