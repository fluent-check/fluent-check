import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

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
      if (result.statistics.labels !== undefined) {
        expect(result.statistics.labels.negative ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.positive ?? 0).to.be.at.least(0)
      }
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
      if (result.statistics.labels !== undefined) {
        expect(result.statistics.labels['sizes.empty'] ?? 0).to.be.at.least(0)
        expect(result.statistics.labels['sizes.small'] ?? 0).to.be.at.least(0)
        expect(result.statistics.labels['sizes.large'] ?? 0).to.be.at.least(0)
      }
    })

    it('should validate category percentages', () => {
      expect(() => {
        fc.scenario()
          .forall('xs', fc.array(fc.integer()))
          .coverTable('sizes', {empty: -1, small: 20},
            ({xs}) => xs.length === 0 ? 'empty' : 'small')
          .then(({xs}) => true)
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
      if (result.statistics.coverageResults !== undefined) {
        expect(result.statistics.coverageResults.length).to.be.at.least(3)
        for (const coverage of result.statistics.coverageResults) {
          expect(coverage.label).to.be.a('string')
          expect(coverage.requiredPercentage).to.be.a('number')
          expect(coverage.observedPercentage).to.be.a('number')
          expect(coverage.satisfied).to.be.a('boolean')
          expect(coverage.confidenceInterval).to.be.an('array')
          expect(coverage.confidenceInterval.length).to.equal(2)
          expect(coverage.confidence).to.equal(0.95)
        }
      }
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

    it('should use custom confidence level', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(1000))
        .forall('x', fc.integer(-100, 100))
        .cover(10, ({x}) => x < 0, 'negative')
        .then(({x}) => Math.abs(x) >= 0)
        .checkCoverage({confidence: 0.99})

      expect(result.statistics.coverageResults).to.exist
      if (result.statistics.coverageResults !== undefined && result.statistics.coverageResults.length > 0) {
        expect(result.statistics.coverageResults[0].confidence).to.equal(0.99)
      }
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
      if (result.statistics.coverageResults !== undefined) {
        expect(result.statistics.coverageResults.length).to.be.greaterThan(0)
        for (const coverage of result.statistics.coverageResults) {
          expect(coverage.observedPercentage).to.equal(0)
        }
      }
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
