import {
  Biased,
  Cached,
  Dedupable,
  Random,
  Shrinkable,
  ConstantExtractionBased,
  CoverageGuidance
} from './mixins/internal'
import {FluentStrategy} from './FluentStrategy'
import {ConstantExtractionConfig, FluentStrategyConfig} from './FluentStrategyTypes'

export class FluentStrategyTypeFactory {

  /**
   * Randomly generates test cases.
   */
  withRandomSampling(sampleSize = 1000) {
    return new FluentStrategyRandomFactory(sampleSize)
  }

  /**
   * Generates test cases based on coverage measurements.
   */
  withCoverageGuidance(importsPath = 'test') {
    return new FluentStrategyCoverageFactory(importsPath)
  }

}

export class FluentStrategyFactory {

  /**
   * Strategy mixin composition
   */
  protected strategy = FluentStrategy

  /**
   * Strategy configuration
   */
  protected configuration: FluentStrategyConfig = {
    sampleSize: 1000,
    shrinkSize: 500,
    globSource: '',
    maxNumConst: 100,
    numericConstMaxRange: 100,
    maxStringTransformations: 50,
    importsPath: 'test'
  }

  /**
   * Builds and returns the FluentStrategy with a specified configuration.
   */
  build(): FluentStrategy {
    return new this.strategy(this.configuration)
  }

  /**
   * Default strategy composition.
   */
  defaultStrategy() {
    this.configuration = {...this.configuration}
    this.strategy = Shrinkable(Cached(Biased(Dedupable(Random(this.strategy)))))
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
   * Enables constant extraction. As additional configuration, there is the possibility of indicating the following
   * parameters in the config parameter:
   *
   * globSource - source from where constants should be extracted, apart from the test case assertion(s) which are
   *              used by default.
   * maxNumConst - maximum number of constants to be extracted, either numeric or string based.
   * numericConstMaxRange - maximum numeric range interval that can be infered.
   * maxStringTransformations - maximum number of transformations that can be applied to the extracted string constants.
   *
   */
  withConstantExtraction(config?: ConstantExtractionConfig) {
    this.configuration = {...this.configuration, ...config}
    this.strategy = ConstantExtractionBased(this.strategy)
    return this
  }

}

export class FluentStrategyRandomFactory extends FluentStrategyFactory {

  /**
   * Default constructor for random-based search strategies.
   */
  constructor(sampleSize) {
    super()
    this.configuration = {...this.configuration, sampleSize}
    this.strategy = Random(this.strategy)
  }

  /**
   * Enables sampling without replacement, which avoids testing duplicate test cases.
   */
  withoutReplacement() {
    this.strategy = Dedupable(this.strategy)
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
   * Enables shrinking. It is also possible to configure the shrinking size, which by default is 500.
   */
  withShrinking(shrinkSize = 500) {
    this.configuration = {...this.configuration, shrinkSize}
    this.strategy = Shrinkable(this.strategy)
    return this
  }

}

export class FluentStrategyCoverageFactory extends FluentStrategyFactory {

  /**
   * Default constructor for coverage-guided search strategies.
   */
  constructor(importsPath) {
    super()
    this.configuration = {...this.configuration, importsPath}
    this.strategy = CoverageGuidance(this.strategy)
  }
}
