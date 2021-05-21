import {
  Biased,
  Cached,
  Random,
  Dedupable,
  Shrinkable,
  CoverageTracker,
  CoverageGuidance,
  DynamicSampleSizing,
  ConstantExtractionBased,
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
   * Generates test cases based on coverage measurements. Currently, this strategy has the limitation of not allowing a
   * test suite to depend on data inside the test suite itself. Therefore all data where coverage needs to be measured
   * should be imported.
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
    globSource: '',
    pairwise: false,
    shrinkSize: 500,
    sampleSize: 1000,
    maxNumConst: 100,
    maxNumMutations: 5,
    importsPath: 'test',
    coveragePercentage: 100,
    timeout: Number.MAX_SAFE_INTEGER,
    maxNumTestCases: Number.MAX_SAFE_INTEGER
  }

  /**
   * Builds and returns the FluentStrategy with a specified configuration.
   */
  build(): FluentStrategy {
    return new this.strategy(this.configuration)
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

  /**
   * Enables pairwise testing.
   */
  withPairWiseTesting() {
    this.configuration = {...this.configuration, pairwise: true}
    return this
  }

  /**
   * Enables stop testing after a given timeout is reached.
   */
  withTimeout(timeout = Number.MAX_SAFE_INTEGER) {
    this.configuration = {...this.configuration, timeout}
    return this
  }

  /**
   * Enables stop testing after a given number of test cases is reached.
   */
  withMaxNumberOfTestCases(maxNumTestCases = Number.MAX_SAFE_INTEGER) {
    this.configuration = {...this.configuration, maxNumTestCases}
    return this
  }

  /**
   * Enables coverage tracking regardless of the selected base strategy.
   */
  withCoverageTracking(importsPath = 'test') {
    this.configuration = {...this.configuration, importsPath}
    this.strategy = CoverageTracker(this.strategy)
    return this
  }

  /**
   * Enables dynamic sample sizing, which adjusts the sample size based on the number of arbitraries used in a
   * given test.
   */
  withDynamicSampleSizing() {
    this.strategy = DynamicSampleSizing(this.strategy)
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
   * Default strategy composition.
   */
  defaultStrategy() {
    this.configuration = {...this.configuration}
    this.strategy = Shrinkable(Cached(Biased(Dedupable(Random(this.strategy)))))
    return this
  }

}

export class FluentStrategyCoverageFactory extends FluentStrategyFactory {

  /**
   * Default constructor for coverage-guided search strategies. By default constants extraction and
   * pairwise combinations are considered.
   */
  constructor(importsPath) {
    super()
    this.configuration = {...this.configuration, importsPath}
    this.strategy = CoverageTracker(CoverageGuidance(this.strategy))
  }

  /**
   * Defines the minimum coverage that needs to be achieved before stopping the testing process.
   */
  withMinimumCoverage(coveragePercentage) {
    this.configuration = {...this.configuration, coveragePercentage}
    return this
  }

  /**
   * Defines the maximum number of mutations applied to each arbitrary variable of a given test case.
   */
  withMaxNumMutationsPerArbitrary(maxNumMutations) {
    this.configuration = {...this.configuration, maxNumMutations}
    return this
  }

}
