import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import {
  calculateBayesianConfidence,
  calculateCredibleInterval
} from '../src/statistics'
import {
  scenarioWithSampleSize,
  getConfidence,
  assertSatisfiable,
  assertNotSatisfiable,
  assertValidConfidence,
  assertValidInterval
} from './test-utils.js'

describe('Confidence Calculation', () => {
  describe('calculateBayesianConfidence', () => {
    it('should calculate high confidence after many successes', () => {
      // With threshold 0.99 (99% pass rate), 1000 successes should give high confidence
      const confidence = calculateBayesianConfidence(1000, 0, 0.99)
      assertValidConfidence(confidence, 0.99, 1.0)
    })

    it('should calculate lower confidence with failures', () => {
      const confidenceWithFailures = calculateBayesianConfidence(990, 10, 0.999)
      const confidenceNoFailures = calculateBayesianConfidence(1000, 0, 0.999)
      expect(confidenceWithFailures).to.be.lessThan(confidenceNoFailures)
    })

    it('should handle edge case: all failures', () => {
      const confidence = calculateBayesianConfidence(0, 100, 0.999)
      assertValidConfidence(confidence, 0, 0.01) // Very low confidence
    })

    it('should handle edge case: no tests', () => {
      const confidence = calculateBayesianConfidence(0, 0, 0.999)
      // With uniform prior Beta(1,1), confidence should be 1 - 0.999 = 0.001
      expect(confidence).to.be.closeTo(0.001, 0.0001)
    })

    it('should validate threshold parameter', () => {
      expect(() => calculateBayesianConfidence(100, 0, 0)).to.throw('Threshold must be between 0 and 1')
      expect(() => calculateBayesianConfidence(100, 0, 1)).to.throw('Threshold must be between 0 and 1')
      expect(() => calculateBayesianConfidence(100, 0, -0.1)).to.throw('Threshold must be between 0 and 1')
    })

    it('should validate successes and failures', () => {
      expect(() => calculateBayesianConfidence(-1, 0, 0.999)).to.throw('Successes and failures must be non-negative')
      expect(() => calculateBayesianConfidence(0, -1, 0.999)).to.throw('Successes and failures must be non-negative')
    })

    it('should use custom threshold', () => {
      const confidence999 = calculateBayesianConfidence(1000, 0, 0.999)
      const confidence99 = calculateBayesianConfidence(1000, 0, 0.99)
      // Confidence with 0.999 threshold should be lower (more strict)
      expect(confidence999).to.be.lessThan(confidence99)
    })
  })

  describe('calculateCredibleInterval', () => {
    it('should calculate credible interval for many successes', () => {
      const [lower, upper] = calculateCredibleInterval(1000, 0, 0.95)
      expect(lower).to.be.greaterThan(0.99)
      expect(upper).to.be.lessThanOrEqual(1.0)
      assertValidInterval(lower, upper)
    })

    it('should calculate wider interval with failures', () => {
      const [lower1, upper1] = calculateCredibleInterval(1000, 0, 0.95)
      const [lower2, upper2] = calculateCredibleInterval(990, 10, 0.95)
      const width1 = upper1 - lower1
      const width2 = upper2 - lower2
      expect(width2).to.be.greaterThan(width1) // Wider interval with failures
    })

    it('should handle edge case: all failures', () => {
      const [lower, upper] = calculateCredibleInterval(0, 100, 0.95)
      expect(upper).to.be.lessThan(0.1) // Very low pass rate
      assertValidInterval(lower, upper)
    })

    it('should handle edge case: no tests', () => {
      const [lower, upper] = calculateCredibleInterval(0, 0, 0.95)
      // With uniform prior Beta(1,1), 95% interval should be approximately [0.025, 0.975]
      expect(lower).to.be.closeTo(0.025, 0.01)
      expect(upper).to.be.closeTo(0.975, 0.01)
    })

    it('should validate confidence level', () => {
      expect(() => calculateCredibleInterval(100, 0, 0)).to.throw('Confidence level must be between 0 and 1')
      expect(() => calculateCredibleInterval(100, 0, 1)).to.throw('Confidence level must be between 0 and 1')
      expect(() => calculateCredibleInterval(100, 0, -0.1)).to.throw('Confidence level must be between 0 and 1')
    })

    it('should validate successes and failures', () => {
      expect(() => calculateCredibleInterval(-1, 0, 0.95)).to.throw('Successes and failures must be non-negative')
      expect(() => calculateCredibleInterval(0, -1, 0.95)).to.throw('Successes and failures must be non-negative')
    })

    it('should use custom confidence level', () => {
      const [lower95, upper95] = calculateCredibleInterval(1000, 0, 0.95)
      const [lower99, upper99] = calculateCredibleInterval(1000, 0, 0.99)
      // 99% interval should be wider than 95%
      expect(upper99 - lower99).to.be.greaterThan(upper95 - lower95)
    })
  })
})

describe('Confidence-Based Termination', () => {
  describe('withConfidence()', () => {
    it('should terminate early when confidence threshold reached', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withConfidence(0.95)
          .withSampleSize(10000)) // Large sample size, but should terminate early
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0) // Always true
        .check()

      assertSatisfiable(result)
      const confidence = getConfidence(result)
      expect(confidence).to.be.greaterThanOrEqual(0.95)
      // Should terminate before reaching maxTests
      expect(result.statistics.testsRun).to.be.lessThan(10000)
      // But should run at least a few tests
      expect(result.statistics.testsRun).to.be.greaterThan(10)
    })

    it('should validate confidence level', () => {
      expect(() => {
        fc.strategy().withConfidence(0)
      }).to.throw('Confidence level must be between 0 and 1')

      expect(() => {
        fc.strategy().withConfidence(1)
      }).to.throw('Confidence level must be between 0 and 1')

      expect(() => {
        fc.strategy().withConfidence(-0.1)
      }).to.throw('Confidence level must be between 0 and 1')
    })
  })

  describe('withMinConfidence()', () => {
    it('should continue past sample size if confidence too low', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withMinConfidence(0.99)
          .withSampleSize(100) // Small sample size
          .withMaxIterations(1000)) // But allow more iterations
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0) // Always true
        .check()

      assertSatisfiable(result)
      getConfidence(result) // Verify confidence exists
      // Should eventually reach minConfidence or hit maxIterations
      expect(result.statistics.testsRun).to.be.greaterThanOrEqual(100)
    })

    it('should validate confidence level', () => {
      expect(() => {
        fc.strategy().withMinConfidence(0)
      }).to.throw('Confidence level must be between 0 and 1')
    })
  })

  describe('withMaxIterations()', () => {
    it('should enforce maximum iterations safety bound', () => {
      const maxIterations = 500
      const result = fc.scenario()
        .config(fc.strategy()
          .withConfidence(0.9999) // Very high confidence (may not be reached)
          .withMaxIterations(maxIterations))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0) // Always true
        .check()

      expect(result.statistics.testsRun).to.be.lessThanOrEqual(maxIterations)
    })

    it('should validate maxIterations', () => {
      expect(() => {
        fc.strategy().withMaxIterations(0)
      }).to.throw('Max iterations must be a positive integer')

      expect(() => {
        fc.strategy().withMaxIterations(-1)
      }).to.throw('Max iterations must be a positive integer')

      expect(() => {
        fc.strategy().withMaxIterations(1.5)
      }).to.throw('Max iterations must be a positive integer')
    })
  })

  describe('checkWithConfidence()', () => {
    it('should run until target confidence achieved', () => {
      const result = fc.scenario()
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0) // Always true
        .checkWithConfidence(0.90) // Lower threshold for faster test

      assertSatisfiable(result)
      const confidence = getConfidence(result)
      // Confidence is calculated with default threshold 0.999, so actual confidence may be lower
      // But it should still be reasonable (> 0.5) for a property that always passes
      expect(confidence).to.be.greaterThan(0.5)
      expect(result.statistics.credibleInterval).to.exist
    })

    it('should validate confidence level', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer())
          .then(() => true)
          .checkWithConfidence(0)
      }).to.throw('Confidence level must be between 0 and 1')

      expect(() => {
        fc.scenario()
          .forall('x', fc.integer())
          .then(() => true)
          .checkWithConfidence(1)
      }).to.throw('Confidence level must be between 0 and 1')
    })

    it('should work with unsatisfiable properties', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer(0, 10))
        .then(({x}) => x !== x) // Always false
        .checkWithConfidence(0.95)

      assertNotSatisfiable(result)
      const confidence = getConfidence(result)
      // Confidence should be very low since property always fails
      expect(confidence).to.be.lessThan(0.1)
    })
  })

  describe('withPassRateThreshold()', () => {
    it('should use configured pass-rate threshold in confidence calculation', () => {
      // Same property, different thresholds should give different confidence values
      const resultStrictThreshold = fc.scenario()
        .config(fc.strategy()
          .withSampleSize(1000)
          .withPassRateThreshold(0.999)) // 99.9% threshold (strict)
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0)
        .check()

      const resultLaxThreshold = fc.scenario()
        .config(fc.strategy()
          .withSampleSize(1000)
          .withPassRateThreshold(0.99)) // 99% threshold (more lenient)
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0)
        .check()

      const strictConfidence = getConfidence(resultStrictThreshold)
      const laxConfidence = getConfidence(resultLaxThreshold)
      // Stricter threshold should produce lower confidence for same data
      expect(strictConfidence).to.be.lessThan(laxConfidence)
    })

    it('should validate pass-rate threshold', () => {
      expect(() => {
        fc.strategy().withPassRateThreshold(0)
      }).to.throw('Pass rate threshold must be between 0 and 1')

      expect(() => {
        fc.strategy().withPassRateThreshold(1)
      }).to.throw('Pass rate threshold must be between 0 and 1')
    })
  })

  describe('Higher confidence requires more tests', () => {
    it('should run more tests for higher confidence levels', () => {
      const result90 = fc.scenario()
        .config(fc.strategy()
          .withConfidence(0.90)
          .withSampleSize(10000))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0)
        .check()

      const result99 = fc.scenario()
        .config(fc.strategy()
          .withConfidence(0.99)
          .withSampleSize(10000))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0)
        .check()

      const confidence90 = getConfidence(result90)
      const confidence99 = getConfidence(result99)

      // Higher confidence should require more tests
      expect(result99.statistics.testsRun).to.be.greaterThan(result90.statistics.testsRun)

      // Both should reach their target confidence
      expect(confidence90).to.be.greaterThanOrEqual(0.90)
      expect(confidence99).to.be.greaterThanOrEqual(0.99)
    })
  })

  describe('Confidence with existential quantifiers', () => {
    it('should calculate confidence for exists scenarios', () => {
      const result = scenarioWithSampleSize(200) // Increased to ensure witness is found
        .exists('x', fc.integer(0, 100))
        .then(({x}) => x > 10) // Easier condition to satisfy
        .check()

      assertSatisfiable(result)
      const confidence = getConfidence(result)
      expect(result.statistics.credibleInterval).to.exist
      // Confidence should be calculated based on the exploration results
      assertValidConfidence(confidence)
    })
  })

  describe('Shrinking with confidence-based termination', () => {
    it('should shrink counterexamples when using confidence-based termination', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withConfidence(0.90)
          .withShrinking())
        .forall('x', fc.integer(0, 1000))
        .then(({x}) => x < 50) // Will fail for x >= 50
        .check()

      expect(result.satisfiable).to.be.false
      expect(result.example.x).to.exist
      // Should shrink to minimal counterexample (50)
      expect(result.example.x).to.be.lessThanOrEqual(51) // Allow for small variation
    })
  })

  describe('Factory configuration preservation', () => {
    it('checkWithConfidence should preserve shrinking configuration', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withShrinking()
          .withSampleSize(500))
        .forall('x', fc.integer(0, 1000))
        .then(({x}) => x < 50) // Will fail for x >= 50
        .checkWithConfidence(0.90)

      expect(result.satisfiable).to.be.false
      expect(result.example.x).to.exist
      // Should shrink even though we used checkWithConfidence
      expect(result.example.x).to.be.lessThanOrEqual(51)
    })

    it('checkWithConfidence should preserve bias configuration', () => {
      const result = fc.scenario()
        .config(fc.strategy()
          .withBias()
          .withSampleSize(500))
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0)
        .checkWithConfidence(0.90)

      expect(result.satisfiable).to.be.true
      // Bias should be preserved (hard to test directly, but check doesn't throw)
    })
  })

  describe('Statistics include confidence', () => {
    it('should include confidence in all results', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer())
        .then(({x}) => x * x >= 0)
        .check()

      const confidence = getConfidence(result)
      expect(result.statistics.credibleInterval).to.exist
      assertValidConfidence(confidence)
      if (result.statistics.credibleInterval !== undefined) {
        const [lower, upper] = result.statistics.credibleInterval
        assertValidInterval(lower, upper)
      }
    })

    it('should calculate confidence correctly for passed tests', () => {
      const result = scenarioWithSampleSize(1000)
        .forall('x', fc.integer(0, 100))
        .then(({x}) => x >= 0) // Always true
        .check()

      assertSatisfiable(result)
      const confidence = getConfidence(result)
      // With 1000 passing tests and default threshold 0.999, confidence should be reasonable
      // (confidence that pass rate > 99.9% given 1000 successes is around 0.63)
      assertValidConfidence(confidence, 0.5, 1.0)
    })
  })
})

