import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import {wilsonScoreInterval} from '../src/statistics'

describe('Coverage Requirements', () => {
  describe('cover()', () => {
    it('should add coverage requirement to scenario', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(-50, 50))
        .cover(10, ({x}) => x < 0, 'negative')
        .cover(10, ({x}) => x > 0, 'positive')
        .then(({x}) => Math.abs(x) >= 0)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      // With uniform distribution over [-50, 50], expect ~49% negative, ~49% positive, ~2% zero
      const labels = result.statistics.labels
      if (labels === undefined) throw new Error('Expected labels to be defined')
      const testsRun = result.statistics.testsRun
      expect(labels.negative).to.be.greaterThan(testsRun * 0.3) // At least 30%
      expect(labels.positive).to.be.greaterThan(testsRun * 0.3) // At least 30%
    })

    it('should validate coverage percentage range', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer())
          .cover(-1, ({_x}) => _x >= 0, 'non-negative')
          .then(({_x}) => true)
      }).to.throw('Coverage percentage must be between 0 and 100')

      expect(() => {
        fc.scenario()
          .forall('x', fc.integer())
          .cover(101, ({_x}) => _x >= 0, 'non-negative')
          .then(({_x}) => true)
      }).to.throw('Coverage percentage must be between 0 and 100')
    })
  })

  describe('coverTable()', () => {
    it('should add coverage table to scenario', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('xs', fc.array(fc.integer(), 0, 20))
        .coverTable('sizes', {empty: 5, small: 20, large: 20},
          ({xs}) => xs.length === 0 ? 'empty' : xs.length < 10 ? 'small' : 'large')
        .then(({xs}) => xs.length >= 0)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      const labels = result.statistics.labels
      if (labels === undefined) throw new Error('Expected labels to be defined')
      // All three categories should be tracked
      expect(labels['sizes.empty']).to.be.a('number')
      expect(labels['sizes.small']).to.be.a('number')
      expect(labels['sizes.large']).to.be.a('number')
      // Sum of categories should equal tests run (each test belongs to exactly one category)
      const total = (labels['sizes.empty'] ?? 0) + (labels['sizes.small'] ?? 0) + (labels['sizes.large'] ?? 0)
      expect(total).to.equal(result.statistics.testsRun)
    })

    it('should validate category percentages', () => {
      expect(() => {
        fc.scenario()
          .forall('xs', fc.array(fc.integer()))
          .coverTable('sizes', {empty: -1, small: 20},
            ({xs}) => xs.length === 0 ? 'empty' : 'small')
          .then(() => true)
      }).to.throw('Coverage percentage for category "empty" must be between 0 and 100')
    })
  })

  describe('checkCoverage()', () => {
    it('should verify coverage requirements and return results', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(2000))
        .forall('x', fc.integer(-100, 100))
        .cover(10, ({x}) => x < 0, 'negative')
        .cover(10, ({x}) => x > 0, 'positive')
        .cover(0.5, ({x}) => x === 0, 'zero') // Lower requirement for rare case
        .then(({x}) => Math.abs(x) >= 0)
        .checkCoverage()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.coverageResults).to.exist

      const coverageResults = result.statistics.coverageResults
      if (coverageResults === undefined) throw new Error('Expected coverageResults to be defined')
      expect(coverageResults.length).to.equal(3)

      // All requirements should be satisfied (we set achievable thresholds)
      for (const coverage of coverageResults) {
        expect(coverage.satisfied).to.be.true
      }

      // Verify negative coverage (~50% expected, requiring only 10%)
      const negative = coverageResults.find(c => c.label === 'negative')
      if (negative === undefined) throw new Error('Expected negative coverage to be found')
      expect(negative.observedPercentage).to.be.greaterThan(40)
      expect(negative.observedPercentage).to.be.lessThan(60)
      expect(negative.requiredPercentage).to.equal(10)
      expect(negative.confidenceInterval[0]).to.be.lessThan(negative.observedPercentage)
      expect(negative.confidenceInterval[1]).to.be.greaterThan(negative.observedPercentage)

      // Verify positive coverage (~50% expected, requiring only 10%)
      const positive = coverageResults.find(c => c.label === 'positive')
      if (positive === undefined) throw new Error('Expected positive coverage to be found')
      expect(positive.observedPercentage).to.be.greaterThan(40)
      expect(positive.observedPercentage).to.be.lessThan(60)

      // Verify zero coverage (~0.5% expected)
      const zero = coverageResults.find(c => c.label === 'zero')
      if (zero === undefined) throw new Error('Expected zero coverage to be found')
      expect(zero.observedPercentage).to.be.lessThan(5) // Should be around 0.5%
    })

    it('should throw error when coverage requirements not satisfied', () => {
      expect(() => {
        fc.scenario()
          .config(fc.strategy().withSampleSize(100))
          .forall('x', fc.integer(1, 100)) // Only positive numbers
          .cover(50, ({x}) => x < 0, 'negative') // Requires 50% negative, but impossible
          .then(({x}) => x > 0)
          .checkCoverage()
      }).to.throw('Coverage requirements not satisfied')
    })

    it('should use custom confidence level with wider interval', () => {
      // Run with enough samples for reliable results
      const result95 = fc.scenario()
        .config(fc.strategy().withSampleSize(500))
        .forall('x', fc.integer(-100, 100))
        .cover(10, ({x}) => x < 0, 'negative')
        .then(({x}) => Math.abs(x) >= 0)
        .checkCoverage({confidence: 0.95})

      const result99 = fc.scenario()
        .config(fc.strategy().withSampleSize(500))
        .forall('x', fc.integer(-100, 100))
        .cover(10, ({x}) => x < 0, 'negative')
        .then(({x}) => Math.abs(x) >= 0)
        .checkCoverage({confidence: 0.99})

      const coverageResults95 = result95.statistics.coverageResults
      const coverageResults99 = result99.statistics.coverageResults
      if (coverageResults95 === undefined || coverageResults99 === undefined) {
        throw new Error('Expected coverageResults')
      }
      const coverage95 = coverageResults95[0]
      const coverage99 = coverageResults99[0]
      if (coverage95 === undefined || coverage99 === undefined) {
        throw new Error('Expected coverage entries')
      }

      expect(coverage95.confidence).to.equal(0.95)
      expect(coverage99.confidence).to.equal(0.99)

      // Higher confidence should produce wider interval
      const width95 = coverage95.confidenceInterval[1] - coverage95.confidenceInterval[0]
      const width99 = coverage99.confidenceInterval[1] - coverage99.confidenceInterval[0]
      expect(width99).to.be.greaterThan(width95)
    })

    it('should handle scenarios without coverage requirements', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(10))
        .forall('x', fc.integer())
        .then(({x}) => x === x)
        .checkCoverage()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.coverageResults).to.be.undefined
    })

    it('should handle zero tests run', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(0))
        .forall('x', fc.integer())
        .cover(10, ({x}) => x >= 0, 'non-negative')
        .then(({x}) => x >= 0)
        .checkCoverage()

      expect(result.statistics.testsRun).to.equal(0)
      expect(result.statistics.coverageResults).to.exist

      const coverageResults = result.statistics.coverageResults
      if (coverageResults === undefined) throw new Error('Expected coverageResults')
      const coverage = coverageResults[0]
      if (coverage === undefined) throw new Error('Expected coverage entry')
      expect(coverage.observedPercentage).to.equal(0)
      // With zero tests, Wilson interval should be [0, 1] (full uncertainty)
      expect(coverage.confidenceInterval[0]).to.equal(0)
      expect(coverage.confidenceInterval[1]).to.equal(100) // Scaled to percentage
      // With 0 tests and interval [0, 100], 10% requirement is satisfied (10 <= 100)
      expect(coverage.satisfied).to.be.true
    })
  })

  describe('Wilson score interval', () => {
    it('should return [0, 1] for zero trials', () => {
      const [lower, upper] = wilsonScoreInterval(0, 0)
      expect(lower).to.equal(0)
      expect(upper).to.equal(1)
    })

    it('should handle all successes correctly', () => {
      const [lower, upper] = wilsonScoreInterval(100, 100, 0.95)
      expect(lower).to.be.greaterThan(0.95) // Lower bound should be high
      expect(upper).to.equal(1) // Upper bound clamped to 1
    })

    it('should handle zero successes correctly', () => {
      const [lower, upper] = wilsonScoreInterval(0, 100, 0.95)
      expect(lower).to.be.closeTo(0, 1e-10) // Lower bound clamped to 0
      expect(upper).to.be.lessThan(0.05) // Upper bound should be low
    })

    it('should produce symmetric interval for 50% proportion', () => {
      const [lower, upper] = wilsonScoreInterval(50, 100, 0.95)
      const center = 0.5
      const lowerDiff = center - lower
      const upperDiff = upper - center
      // Should be approximately symmetric (within 1% tolerance)
      expect(Math.abs(lowerDiff - upperDiff)).to.be.lessThan(0.01)
    })

    it('should produce narrower intervals with larger sample sizes', () => {
      const [lower100, upper100] = wilsonScoreInterval(50, 100, 0.95)
      const [lower1000, upper1000] = wilsonScoreInterval(500, 1000, 0.95)

      const width100 = upper100 - lower100
      const width1000 = upper1000 - lower1000

      expect(width1000).to.be.lessThan(width100)
    })

    it('should produce wider intervals with higher confidence', () => {
      const [lower95, upper95] = wilsonScoreInterval(50, 100, 0.95)
      const [lower99, upper99] = wilsonScoreInterval(50, 100, 0.99)

      const width95 = upper95 - lower95
      const width99 = upper99 - lower99

      expect(width99).to.be.greaterThan(width95)
    })
  })

  describe('coverage satisfaction logic', () => {
    it('should satisfy requirement when observed is clearly above required', () => {
      // 80% observed, 10% required - should easily pass
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.boolean())
        .cover(10, ({x}) => x === true, 'true-values')
        .then(() => true)
        .checkCoverage()

      const coverageResults = result.statistics.coverageResults
      if (coverageResults === undefined) throw new Error('Expected coverageResults')
      const coverage = coverageResults[0]
      if (coverage === undefined) throw new Error('Expected coverage entry')
      expect(coverage.satisfied).to.be.true
      expect(coverage.requiredPercentage).to.equal(10)
      expect(coverage.observedPercentage).to.be.greaterThan(30) // ~50% expected
    })

    it('should fail requirement when observed is clearly below required', () => {
      // Trying to get 90% of values < 10 from range [0, 100] - impossible
      expect(() => {
        fc.scenario()
          .config(fc.strategy().withSampleSize(200))
          .forall('x', fc.integer(0, 100))
          .cover(90, ({x}) => x < 10, 'small-values')
          .then(() => true)
          .checkCoverage()
      }).to.throw('Coverage requirements not satisfied')
    })

    it('should use upper bound of confidence interval for satisfaction', () => {
      // This tests the R <= U logic: even if observed is slightly below required,
      // if the upper confidence bound is >= required, it should pass
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(200))
        .forall('x', fc.integer(0, 100))
        .cover(10, ({x}) => x < 12, 'small-values') // ~12% expected, 10% required
        .then(() => true)
        .checkCoverage()

      const coverageResults = result.statistics.coverageResults
      if (coverageResults === undefined) throw new Error('Expected coverageResults')
      const coverage = coverageResults[0]
      if (coverage === undefined) throw new Error('Expected coverage entry')
      // The requirement should be satisfied because upper bound of CI >= 10%
      expect(coverage.satisfied).to.be.true
      expect(coverage.requiredPercentage).to.equal(10)
      // Upper bound should be >= 10%
      expect(coverage.confidenceInterval[1]).to.be.greaterThanOrEqual(10)
    })
  })

  describe('coverage with classification', () => {
    it('should work alongside existing classification methods', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(-50, 50))
        .classify(({x}) => x < 0, 'negative-classify')
        .cover(10, ({x}) => x < 0, 'negative-cover')
        .then(({x}) => Math.abs(x) >= 0)
        .checkCoverage()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        expect(result.statistics.labels['negative-classify']).to.exist
        expect(result.statistics.labels['negative-cover']).to.exist
      }
    })
  })
})
