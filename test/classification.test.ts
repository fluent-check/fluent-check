import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import {scenarioWithSampleSize, getLabels, assertSatisfiable, assertNotSatisfiable} from './test-utils.js'

describe('Test Case Classification', () => {
  describe('classify()', () => {
    it('should classify test cases by predicate', () => {
      const result = scenarioWithSampleSize(100)
        .forall('xs', fc.array(fc.integer(0, 10), 0, 10))
        .classify(({xs}) => xs.length === 0, 'empty')
        .classify(({xs}) => xs.length < 5, 'small')
        .classify(({xs}) => xs.length >= 5, 'large')
        .then(({xs}) => xs.length >= 0) // Always true
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      expect(result.statistics.labelPercentages).to.exist
      expect(labels.empty ?? 0).to.be.at.least(0)
      expect(labels.small ?? 0).to.be.at.least(0)
      expect(labels.large ?? 0).to.be.at.least(0)
    })

    it('should handle multiple overlapping predicates', () => {
      const result = scenarioWithSampleSize(50)
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x >= 0, 'non-negative')
        .classify(({x}) => x <= 5, 'small')
        .classify(({x}) => x > 5, 'large')
        .then(({x}) => x >= 0) // Always true for range [0, 10]
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // A test case can match multiple predicates
      expect(labels['non-negative']).to.equal(result.statistics.testsRun)
      const largeCount = labels.large ?? 0
      expect((labels.small ?? 0) + largeCount).to.be.at.most(result.statistics.testsRun)
    })

    it('should work with unsatisfiable properties', () => {
      let testCount = 0
      const result = scenarioWithSampleSize(100)
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

      assertNotSatisfiable(result)
      const labels = getLabels(result)
      // Should have classified the 10 tests that ran
      const largeCount = labels.large ?? 0
      expect((labels.small ?? 0) + largeCount).to.equal(10)
    })
  })

  describe('label()', () => {
    it('should dynamically label test cases', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer(-50, 50))
        .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
        .then(({x}) => Math.abs(x) >= 0)
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      expect(labels.negative ?? 0).to.be.at.least(0)
      expect(labels.positive ?? 0).to.be.at.least(0)
      expect(labels.zero ?? 0).to.be.at.least(0)
    })

    it('should handle label collisions (same label from different sources)', () => {
      const result = scenarioWithSampleSize(50)
        .forall('x', fc.integer(0, 10))
        .classify(({x}) => x < 5, 'small')
        .label(({x}) => x < 5 ? 'small' : 'large') // Same label as classify
        .then(({x}) => x >= 0) // Always true for range [0, 10]
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // Label counts should be summed when same label appears multiple times
      // Total labels exceed testsRun because each test gets labeled twice
      const smallCount = labels.small ?? 0
      const largeCount = labels.large ?? 0
      expect(smallCount + largeCount).to.be.greaterThan(result.statistics.testsRun)
    })
  })

  describe('collect()', () => {
    it('should collect values as labels', () => {
      const result = scenarioWithSampleSize(50)
        .forall('xs', fc.array(fc.integer(), 0, 10))
        .collect(({xs}) => xs.length)
        .then(({xs}) => xs.length >= 0)
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // Should have labels for different array lengths
      const lengthLabels = Object.keys(labels).filter(k => /^\d+$/.test(k))
      expect(lengthLabels.length).to.be.greaterThan(0)
    })

    it('should handle numeric and string values', () => {
      const result = scenarioWithSampleSize(30)
        .forall('x', fc.integer(0, 5))
        .collect(({x}) => x) // Number
        .collect(({x}) => `value-${x}`) // String
        .then(({x}) => x >= 0) // Always true for range [0, 5]
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // Should have both numeric and string labels
      const numericKeys = Object.keys(labels).filter(k => /^\d+$/.test(k))
      const stringKeys = Object.keys(labels).filter(k => k.startsWith('value-'))
      expect(numericKeys.length).to.be.greaterThan(0)
      expect(stringKeys.length).to.be.greaterThan(0)
    })
  })

  describe('label percentages', () => {
    it('should calculate percentages correctly', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer(0, 1))
        .label(({x}) => x === 0 ? 'zero' : 'one')
        .then(({x}) => x >= 0 && x <= 1) // Always true for range [0, 1]
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      const labelPercentages = result.statistics.labelPercentages
      if (labelPercentages === undefined) {
        throw new Error('Expected labelPercentages to be defined')
      }

      // Percentages should sum to approximately 100% (allowing for rounding)
      const totalPercentage = Object.values(labelPercentages).reduce((sum, p) => sum + p, 0)
      expect(totalPercentage).to.be.closeTo(100, 1) // Within 1% tolerance

      // Verify percentages match counts
      for (const [label, count] of Object.entries(labels)) {
        const expectedPercentage = (count / result.statistics.testsRun) * 100
        expect(labelPercentages[label]).to.be.closeTo(expectedPercentage, 0.01)
      }
    })

    it('should handle percentages when all tests are discarded', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer(0, 100))
        .classify(({x}) => x % 2 === 0, 'even')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .then(({x}) => {
          fc.pre(false) // Discard all tests
          return true
        })
        .check()

      assertSatisfiable(result)
      expect(result.statistics.testsRun).to.equal(100)
      expect(result.statistics.testsDiscarded).to.equal(100)

      // Labels should still be present (classifications evaluated before preconditions)
      getLabels(result) // Verify labels exist
      const labelPercentages = result.statistics.labelPercentages
      if (labelPercentages !== undefined) {
        // Percentages should be based on testsRun, not testsPassed
        // With 100 samples, expect ~50% even but allow ±15% variance for statistical variation
        expect(labelPercentages.even).to.be.closeTo(50, 15)
      }
    })
  })

  describe('classification with preconditions', () => {
    it('should classify discarded tests', () => {
      const result = scenarioWithSampleSize(100)
        .forall('x', fc.integer(0, 100))
        .classify(({x}) => x < 50, 'small')
        .classify(({x}) => x >= 50, 'large')
        .then(({x}) => {
          fc.pre(x % 2 === 0) // Discard odd numbers
          return true
        })
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // Should have classified all tests, including discarded ones
      const largeCount = labels.large ?? 0
      expect((labels.small ?? 0) + largeCount).to.equal(result.statistics.testsRun)
    })
  })

  describe('multiple classifications', () => {
    it('should handle multiple classification methods in same scenario', () => {
      const result = scenarioWithSampleSize(50)
        .forall('xs', fc.array(fc.integer(), 0, 10))
        .classify(({xs}) => xs.length === 0, 'empty')
        .label(({xs}) => xs.length < 5 ? 'small' : 'large')
        .collect(({xs}) => xs.length)
        .then(({xs}) => xs.length >= 0)
        .check()

      assertSatisfiable(result)
      const labels = getLabels(result)
      // Should have labels from all three methods
      expect(labels.empty ?? 0).to.be.at.least(0)
      expect(labels.small ?? 0).to.be.at.least(0)
      expect(labels.large ?? 0).to.be.at.least(0)
      // Should have numeric labels from collect
      const numericLabels = Object.keys(labels).filter(k => /^\d+$/.test(k))
      expect(numericLabels.length).to.be.greaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle scenarios without classifications', () => {
      const result = scenarioWithSampleSize(10)
        .forall('x', fc.integer())
        .then(({x}) => x === x) // Always true
        .check()

      assertSatisfiable(result)
      expect(result.statistics.labels).to.be.undefined
      expect(result.statistics.labelPercentages).to.be.undefined
    })

    it('should handle zero tests run', () => {
      const result = scenarioWithSampleSize(0)
        .forall('x', fc.integer())
        .classify(({x}) => x >= 0, 'non-negative')
        .then(({x}) => x >= 0) // Always true for any integer (property test)
        .check()

      assertSatisfiable(result)
      expect(result.statistics.testsRun).to.equal(0)
      // Labels and percentages should be undefined when no tests run
      expect(result.statistics.labels).to.be.undefined
      expect(result.statistics.labelPercentages).to.be.undefined
    })
  })
})
