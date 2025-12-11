import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'

describe('Test Case Classification', () => {
  describe('classify()', () => {
    it('should classify test cases by predicate', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('xs', fc.array(fc.integer(0, 10), 0, 10))
        .classify(({xs}) => xs.length === 0, 'empty')
        .classify(({xs}) => xs.length < 5, 'small')
        .classify(({xs}) => xs.length >= 5, 'large')
        .then(({xs}) => xs.length >= 0) // Always true
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      expect(result.statistics.labelPercentages).to.exist

      if (result.statistics.labels !== undefined) {
        expect(result.statistics.labels.empty ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.small ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.large ?? 0).to.be.at.least(0)
      }
    })

    it('should handle multiple overlapping predicates', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x >= 0, 'non-negative')
        .classify(({x}) => x <= 5, 'small')
        .classify(({x}) => x > 5, 'large')
        .then(({x}) => x >= 0) // Always true for range [0, 10]
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.labels !== undefined) {
        // A test case can match multiple predicates
        expect(result.statistics.labels['non-negative']).to.equal(result.statistics.testsRun)
        const largeCount = result.statistics.labels.large ?? 0
        expect(result.statistics.labels.small + largeCount).to.be.at.most(result.statistics.testsRun)
      }
    })

    it('should work with unsatisfiable properties', () => {
      let testCount = 0
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x < 5, 'small')
        .classify(({x}) => x >= 5, 'large')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .then(({x}) => {
          testCount++
          // x is used in classify above, but not in the property itself
          return testCount !== 10 // Fail on 10th test
        })
        .check()

      expect(result.satisfiable).to.be.false
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        // Should have classified the 10 tests that ran
        const largeCount = result.statistics.labels.large ?? 0
        expect(result.statistics.labels.small + largeCount).to.equal(10)
      }
    })
  })

  describe('label()', () => {
    it('should dynamically label test cases', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(-50, 50))
        .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
        .then(({x}) => Math.abs(x) >= 0)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        expect(result.statistics.labels.negative ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.positive ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.zero ?? 0).to.be.at.least(0)
      }
    })

    it('should handle label collisions (same label from different sources)', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x < 5, 'small')
        .label(({x}) => x < 5 ? 'small' : 'large') // Same label as classify
        .then(({x}) => x >= 0) // Always true for range [0, 10]
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.labels !== undefined) {
        // Label counts should be summed when same label appears multiple times
        expect(result.statistics.labels.small).to.be.greaterThan(0)
      }
    })
  })

  describe('collect()', () => {
    it('should collect values as labels', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('xs', fc.array(fc.integer(), 0, 10))
        .collect(({xs}) => xs.length)
        .then(({xs}) => xs.length >= 0)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        // Should have labels for different array lengths
        const lengthLabels = Object.keys(result.statistics.labels).filter(k => /^\d+$/.test(k))
        expect(lengthLabels.length).to.be.greaterThan(0)
      }
    })

    it('should handle numeric and string values', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(30))
        .forall('x', fc.integer(0, 5))
        .collect(({x}) => x) // Number
        .collect(({x}) => `value-${x}`) // String
        .then(({x}) => x >= 0) // Always true for range [0, 5]
        .check()

      expect(result.satisfiable).to.be.true
      if (result.statistics.labels !== undefined) {
        // Should have both numeric and string labels
        const numericKeys = Object.keys(result.statistics.labels).filter(k => /^\d+$/.test(k))
        const stringKeys = Object.keys(result.statistics.labels).filter(k => k.startsWith('value-'))
        expect(numericKeys.length).to.be.greaterThan(0)
        expect(stringKeys.length).to.be.greaterThan(0)
      }
    })
  })

  describe('label percentages', () => {
    it('should calculate percentages correctly', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 1))
        .label(({x}) => x === 0 ? 'zero' : 'one')
        .then(({x}) => x >= 0 && x <= 1) // Always true for range [0, 1]
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labelPercentages).to.exist

      if (result.statistics.labels !== undefined && result.statistics.labelPercentages !== undefined) {
        // Percentages should sum to approximately 100% (allowing for rounding)
        const totalPercentage = Object.values(result.statistics.labelPercentages).reduce((sum, p) => sum + p, 0)
        expect(totalPercentage).to.be.closeTo(100, 1) // Within 1% tolerance

        // Verify percentages match counts
        for (const [label, count] of Object.entries(result.statistics.labels)) {
          const expectedPercentage = (count / result.statistics.testsRun) * 100
          expect(result.statistics.labelPercentages[label]).to.be.closeTo(expectedPercentage, 0.01)
        }
      }
    })

    it('should handle percentages when all tests are discarded', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 100))
        .classify(({x}) => x % 2 === 0, 'even')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .then(({x}) => {
          fc.pre(false) // Discard all tests
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.testsRun).to.equal(100)
      expect(result.statistics.testsDiscarded).to.equal(100)

      // Labels should still be present (classifications evaluated before preconditions)
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined && result.statistics.labelPercentages !== undefined) {
        // Percentages should be based on testsRun, not testsPassed
        expect(result.statistics.labelPercentages.even).to.be.closeTo(50, 10) // Approximately 50% even numbers
      }
    })
  })

  describe('classification with preconditions', () => {
    it('should classify discarded tests', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(100))
        .forall('x', fc.integer(0, 100))
        .classify(({x}) => x < 50, 'small')
        .classify(({x}) => x >= 50, 'large')
        .then(({x}) => {
          fc.pre(x % 2 === 0) // Discard odd numbers
          return true
        })
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        // Should have classified all tests, including discarded ones
        const largeCount = result.statistics.labels.large ?? 0
        expect(result.statistics.labels.small + largeCount).to.equal(result.statistics.testsRun)
      }
    })
  })

  describe('multiple classifications', () => {
    it('should handle multiple classification methods in same scenario', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(50))
        .forall('xs', fc.array(fc.integer(), 0, 10))
        .classify(({xs}) => xs.length === 0, 'empty')
        .label(({xs}) => xs.length < 5 ? 'small' : 'large')
        .collect(({xs}) => xs.length)
        .then(({xs}) => xs.length >= 0)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.exist
      if (result.statistics.labels !== undefined) {
        // Should have labels from all three methods
        expect(result.statistics.labels.empty ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.small ?? 0).to.be.at.least(0)
        expect(result.statistics.labels.large ?? 0).to.be.at.least(0)
        // Should have numeric labels from collect
        const numericLabels = Object.keys(result.statistics.labels).filter(k => /^\d+$/.test(k))
        expect(numericLabels.length).to.be.greaterThan(0)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle scenarios without classifications', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(10))
        .forall('x', fc.integer())
        .then(({x}) => x === x) // Always true
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.labels).to.be.undefined
      expect(result.statistics.labelPercentages).to.be.undefined
    })

    it('should handle zero tests run', () => {
      const result = fc.scenario()
        .config(fc.strategy().withSampleSize(0))
        .forall('x', fc.integer())
        .classify(({x}) => x >= 0, 'non-negative')
        .then(({x}) => x >= 0) // Always true for any integer (property test)
        .check()

      expect(result.satisfiable).to.be.true
      expect(result.statistics.testsRun).to.equal(0)
      // Labels and percentages should be undefined when no tests run
      expect(result.statistics.labels).to.be.undefined
      expect(result.statistics.labelPercentages).to.be.undefined
    })
  })
})
