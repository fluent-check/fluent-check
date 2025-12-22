import {
  BetaBinomialDistribution,
  IntegerDistribution,
  sampleSizeForConfidence,
  expectedTestsToDetectFailure,
  detectionProbability,
  calculateBayesianConfidence,
  type ArbitraryStatistics,
  type TargetStatistics,
  type ShrinkingStatistics
} from '../src/statistics'
import {DefaultStatisticsAggregator, type StatisticsAggregationInput} from '../src/statisticsAggregator'
import type {DetailedExplorationStats} from '../src/strategies/Explorer'
import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {expect} from 'chai'
import stats from 'jstat'
import {scenarioWithSampleSize, assertStatisticsInvariants, assertSatisfiable} from './test-utils.js'

describe('Statistics tests', () => {
  const deltaFor = (expected: number) => Math.max(1e-8, Math.abs(expected) * 1e-4)

  describe('IntegerDistribution default implementations', () => {
    class TestBinomialDistribution extends IntegerDistribution {
      constructor(public readonly trials: number, public readonly p: number) { super() }
      pdf(k: number): number { return stats.binomial.pdf(k, this.trials, this.p) }
      supportMin(): number { return 0 }
      supportMax(): number { return this.trials }
    }

    const testProp = (prop: (dist: IntegerDistribution, trials: number, p: number) => void): void => {
      for (let trials = 1; trials <= 10; trials++) {
        for (let p = 0.0; p <= 1.0; p += 0.2) {
          prop(new TestBinomialDistribution(trials, p), trials, p)
        }
      }
    }

    it('calculates means correctly', () => {
      testProp((dist, trials, p) => expect(dist.mean()).to.be.closeTo(trials * p, 1e-9))
    })

    it('calculates modes correctly', () => {
      testProp((dist, trials, p) =>
        expect(dist.mode()).to.be.oneOf([Math.floor((trials + 1) * p), Math.ceil((trials + 1) * p) - 1])
      )
    })

    it('calculates cumulative probabilities correctly', () => {
      testProp((dist, trials, p) =>
        [...Array(trials + 1)].forEach((_, k) => {
          expect(dist.cdf(k)).to.be.closeTo(stats.binomial.cdf(k, trials, p), 1e-9)
        })
      )
    })

    it('calculates inverse cumulative probabilities correctly', () => {
      testProp((dist) =>
        [...Array(11)].forEach((_, p2) => {
          const k = dist.inv(0.1 * p2)
          expect(dist.cdf(k)).to.be.gte(0.1 * p2)
          if (k !== dist.supportMin()) {
            expect(dist.cdf(k - 1)).to.be.lt(0.1 * p2)
          }
        })
      )
    })
  })

  describe('Beta-binomial distribution', () => {
    // Test cases: [trials, alpha, beta, expectedMean, expectedMode]
    const testCases: [number, number, number, number, number][] = [
      [1234, 4.5, 3.5, 694.125, 720],
      [31234, 1.0, 1.0, 15617.0, 0],
      [31234, 0.4, 1.0, 8924.0, 0],
      [31234, 1.0, 0.5, 20822.666666667, 31234],
      [31234, 1.4, 1.0, 18219.833333333, 31234],
      [31234, 1.0, 1.5, 12493.6, 0],
      [31234, 0.4, 0.5, 13881.777777778, 0],
      [31234, 0.4, 1.5, 6575.57894733406, 0],
      [31234, 1.4, 0.5, 23014.526315792507, 31234],
      [31234, 1.4, 1.5, 15078.482758214723, 13882],
      [31234, 47.5, 92.5, 10597.3, 10524],
      [312349, 6.2, 52.5, 32990.9, 28645],
      [312364973, 10483.2, 24681.3, 9.312188385882352e7, 93118643],
    ]

    it('defines the mean as a constant-time closed form expression', () => {
      for (const [trials, a, b, expectedMean] of testCases) {
        const actual = new BetaBinomialDistribution(trials, a, b).mean()
        expect(actual).to.be.closeTo(expectedMean, deltaFor(expectedMean))
      }
    })

    it('defines the mode as a constant-time closed form expression', () => {
      for (const [trials, a, b, , expectedMode] of testCases) {
        const actual = new BetaBinomialDistribution(trials, a, b).mode()
        expect(actual).to.be.closeTo(expectedMode, deltaFor(expectedMode))
      }
    })

    it('defines a PDF consistent with its mean definition', () => {
      for (let n = 0; n < 100; n++) {
        const dist = new BetaBinomialDistribution(n, Math.random() * 20, Math.random() * 20)
        const pdfMean = [...Array(n + 1)].reduce((acc: number, _, i) => acc + dist.pdf(i) * i, 0)
        expect(pdfMean).to.be.closeTo(dist.mean(), deltaFor(dist.mean()))
      }
    })
  })

  describe('FluentStatistics', () => {
    // Helper to create a simple passing scenario
    const passingScenario = (sampleSize: number) =>
      scenarioWithSampleSize(sampleSize)
        .forall('x', fc.integer(0, 10))
        .then(() => true)
        .check()

    // Helper to create a scenario that fails on nth test
    const failOnNthScenario = (sampleSize: number, failOn: number) => {
      let count = 0
      return scenarioWithSampleSize(sampleSize)
        .forall('x', fc.integer(0, 100))
        .then(() => ++count !== failOn)
        .check()
    }

    // Helper to create a scenario with precondition filtering
    const filteredScenario = (sampleSize: number, filter: (x: number) => boolean) =>
      scenarioWithSampleSize(sampleSize)
        .forall('x', fc.integer(0, 100))
        .then(({x}) => {
          fc.pre(filter(x))
          return true
        })
        .check()

    describe('testsRun', () => {
      it('equals sample size when all tests pass', () => {
        const result = passingScenario(100)
        expect(result.statistics.testsRun).to.equal(100)
      })

      it('counts tests until counterexample found', () => {
        const result = failOnNthScenario(1000, 7)
        expect(result.satisfiable).to.be.false
        expect(result.statistics.testsRun).to.equal(7)
      })

      it('counts tests until witness found for exists', () => {
        const result = scenarioWithSampleSize(1000)
          .exists('x', fc.integer(0, 100))
          .then(({x}) => x === 42)
          .check()

        assertSatisfiable(result)
        expect(result.statistics.testsRun).to.be.greaterThan(0)
        expect(result.statistics.testsRun).to.be.at.most(1000)
      })

      it('includes discarded tests in count', () => {
        const result = filteredScenario(100, x => x % 3 === 0)
        expect(result.statistics.testsRun).to.equal(100)
        expect(result.statistics.testsDiscarded).to.be.greaterThan(0)
      })
    })

    describe('testsPassed', () => {
      it('equals testsRun when no preconditions', () => {
        const result = passingScenario(75)
        expect(result.statistics.testsPassed).to.equal(75)
        expect(result.statistics.testsDiscarded).to.equal(0)
      })

      it('equals testsRun - testsDiscarded for satisfiable property', () => {
        const result = filteredScenario(200, x => x < 50)
        assertStatisticsInvariants(result)
        expect(result.statistics.testsDiscarded).to.be.greaterThan(0)
        expect(result.statistics.testsPassed).to.be.greaterThan(0)
      })

      it('is 0 when counterexample found immediately', () => {
        const result = scenarioWithSampleSize(150)
          .forall('x', fc.integer(1, 10))
          .then(() => false)
          .check()

        expect(result.statistics.testsPassed).to.equal(0)
        expect(result.statistics.testsRun).to.equal(1)
      })

      it('counts passing tests before counterexample', () => {
        const result = failOnNthScenario(200, 10)
        expect(result.statistics.testsPassed).to.equal(9)
        assertStatisticsInvariants(result)
      })
    })

    describe('testsDiscarded', () => {
      it('equals result.skipped', () => {
        const result = filteredScenario(100, x => x % 2 === 0)
        expect(result.statistics.testsDiscarded).to.equal(result.skipped)
        expect(result.skipped).to.be.greaterThan(0)
      })

      it('is 0 when no preconditions', () => {
        const result = passingScenario(50)
        expect(result.statistics.testsDiscarded).to.equal(0)
      })

      it('tracks discards even when counterexample found', () => {
        let count = 0
        const result = scenarioWithSampleSize(100)
          .forall('x', fc.integer(0, 100))
          .then(() => {
            count++
            if (count === 3 || count === 7 || count === 11) fc.pre(false)
            return count !== 15
          })
          .check()

        expect(result.satisfiable).to.be.false
        expect(result.statistics.testsDiscarded).to.equal(3)
        expect(result.statistics.testsPassed).to.equal(11)
        expect(result.statistics.testsRun).to.equal(15)
      })
    })

    describe('executionTimeMs', () => {
      it('measures actual wall-clock time', () => {
        const delayMs = 50
        const result = scenarioWithSampleSize(1)
          .forall('x', fc.constant(1))
          .then(() => {
            const start = Date.now()
            while (Date.now() - start < delayMs) { /* busy wait */ }
            return true
          })
          .check()

        expect(result.statistics.executionTimeMs).to.be.at.least(delayMs - 20)
        expect(result.statistics.executionTimeMs).to.be.at.most(delayMs * 3)
      })

      it('increases with sample size', () => {
        const workPerTest = 5
        const doWork = () => {
          const start = Date.now()
          while (Date.now() - start < workPerTest) { /* busy wait */ }
          return true
        }

        const small = scenarioWithSampleSize(5).forall('x', fc.constant(1)).then(doWork).check()
        const large = scenarioWithSampleSize(20).forall('x', fc.constant(1)).then(doWork).check()

        expect(large.statistics.executionTimeMs).to.be.at.least(small.statistics.executionTimeMs * 3)
      })
    })

    describe('statistics invariants', () => {
      it('satisfies testsRun = testsPassed + testsDiscarded for satisfiable', () => {
        assertStatisticsInvariants(filteredScenario(150, x => x % 3 === 0))
      })

      it('satisfies testsRun = testsPassed + testsDiscarded + 1 for unsatisfiable', () => {
        const result = failOnNthScenario(200, 15)
        assertStatisticsInvariants(result)
        expect(result.statistics.testsPassed).to.equal(14)
        expect(result.statistics.testsRun).to.equal(15)
      })

      it('handles all tests discarded', () => {
        const result = scenarioWithSampleSize(100)
          .forall('x', fc.integer(0, 100))
          .then(() => { fc.pre(false); return true })
          .check()

        expect(result.statistics.testsRun).to.equal(100)
        expect(result.statistics.testsDiscarded).to.equal(100)
        expect(result.statistics.testsPassed).to.equal(0)
      })

      it('handles exhausted exists scenario', () => {
        const result = scenarioWithSampleSize(50)
          .exists('x', fc.integer(0, 10))
          .then(({x}) => x > 1000)
          .check()

        expect(result.statistics.testsRun).to.equal(50)
        expect(result.statistics.testsPassed).to.equal(50)
        expect(result.statistics.testsDiscarded).to.equal(0)
      })
    })
  })

  describe('DefaultStatisticsAggregator', () => {
    const aggregator = new DefaultStatisticsAggregator()

    it('computes testsPassed and testsDiscarded for satisfiable results', () => {
      const input: StatisticsAggregationInput = {
        testsRun: 100,
        skipped: 30,
        executionTimeMs: 42,
        counterexampleFound: false,
        executionTimeBreakdown: {exploration: 40, shrinking: 2}
      }

      const s = aggregator.aggregate(input)

      expect(s.testsRun).to.equal(100)
      expect(s.testsDiscarded).to.equal(30)
      expect(s.testsPassed).to.equal(70)
      expect(s.testsRun).to.equal(s.testsPassed + s.testsDiscarded)
    })

    it('computes invariants for unsatisfiable results', () => {
      const input: StatisticsAggregationInput = {
        testsRun: 10,
        skipped: 2,
        executionTimeMs: 5,
        counterexampleFound: true,
        executionTimeBreakdown: {exploration: 5, shrinking: 0}
      }

      const s = aggregator.aggregate(input)

      expect(s.testsRun).to.equal(10)
      expect(s.testsDiscarded).to.equal(2)
      expect(s.testsPassed).to.equal(7)
      expect(s.testsRun).to.equal(s.testsPassed + s.testsDiscarded + 1)
    })

    it('computes label and event percentages', () => {
      const input: StatisticsAggregationInput = {
        testsRun: 10,
        skipped: 0,
        executionTimeMs: 0,
        counterexampleFound: false,
        executionTimeBreakdown: {exploration: 0, shrinking: 0},
        labels: {small: 7, large: 3},
        detailedStats: {events: {error: 4, success: 6}}
      }

      const s = aggregator.aggregate(input)

      expect(s.labels).to.deep.equal({small: 7, large: 3})
      expect(s.labelPercentages).to.deep.equal({small: 70, large: 30})
      expect(s.events).to.deep.equal({error: 4, success: 6})
      expect(s.eventPercentages).to.deep.equal({error: 40, success: 60})
    })

    it('passes through detailed and shrinking statistics', () => {
      const arbitraryStats: Record<string, ArbitraryStatistics> = {
        x: {samplesGenerated: 10, uniqueValues: 3, cornerCases: {tested: [0], total: 1}}
      }
      const targets: Record<string, TargetStatistics> = {
        default: {best: 42, observations: 5, mean: 21}
      }
      const detailedStats: DetailedExplorationStats = {
        arbitraryStats,
        events: {hit: 2},
        targets
      }
      const shrinkingStats: ShrinkingStatistics = {
        candidatesTested: 5,
        roundsCompleted: 3,
        improvementsMade: 2
      }
      const input: StatisticsAggregationInput = {
        testsRun: 20,
        skipped: 0,
        executionTimeMs: 10,
        counterexampleFound: false,
        executionTimeBreakdown: {exploration: 10, shrinking: 0},
        detailedStats,
        shrinkingStats
      }

      const s = aggregator.aggregate(input)

      expect(s.arbitraryStats).to.equal(arbitraryStats)
      expect(s.events).to.deep.equal({hit: 2})
      expect(s.targets).to.equal(targets)
      expect(s.shrinking).to.deep.equal(shrinkingStats)
    })
  })

  describe('Statistical utility functions', () => {
    describe('sampleSizeForConfidence', () => {
      it('calculates required tests for target confidence', () => {
        const n = sampleSizeForConfidence(0.999, 0.95)
        expect(calculateBayesianConfidence(n, 0, 0.999)).to.be.at.least(0.95)
        expect(calculateBayesianConfidence(n - 1, 0, 0.999)).to.be.lessThan(0.95)
      })

      it('returns lower values for lower thresholds', () => {
        const n1 = sampleSizeForConfidence(0.99, 0.95)
        const n2 = sampleSizeForConfidence(0.999, 0.95)
        const n3 = sampleSizeForConfidence(0.9999, 0.95)
        expect(n1).to.be.lessThan(n2)
        expect(n2).to.be.lessThan(n3)
      })

      it('returns lower values for lower confidence requirements', () => {
        const n1 = sampleSizeForConfidence(0.999, 0.90)
        const n2 = sampleSizeForConfidence(0.999, 0.95)
        const n3 = sampleSizeForConfidence(0.999, 0.99)
        expect(n1).to.be.lessThan(n2)
        expect(n2).to.be.lessThan(n3)
      })

      it('throws on invalid inputs', () => {
        expect(() => sampleSizeForConfidence(0, 0.95)).to.throw()
        expect(() => sampleSizeForConfidence(1, 0.95)).to.throw()
        expect(() => sampleSizeForConfidence(0.99, 0)).to.throw()
        expect(() => sampleSizeForConfidence(0.99, 1)).to.throw()
      })
    })

    describe('expectedTestsToDetectFailure', () => {
      it('returns reciprocal of failure rate', () => {
        expect(expectedTestsToDetectFailure(0.01)).to.equal(100)
        expect(expectedTestsToDetectFailure(0.001)).to.equal(1000)
        expect(expectedTestsToDetectFailure(1.0)).to.equal(1)
      })

      it('throws on invalid failure rate', () => {
        expect(() => expectedTestsToDetectFailure(0)).to.throw()
        expect(() => expectedTestsToDetectFailure(-0.1)).to.throw()
        expect(() => expectedTestsToDetectFailure(1.5)).to.throw()
      })
    })

    describe('detectionProbability', () => {
      it('calculates ~63% detection at expected value', () => {
        // 1 - (1-p)^n ≈ 0.632 when n = 1/p
        expect(detectionProbability(0.01, 100)).to.be.closeTo(0.634, 0.01)
        expect(detectionProbability(0.001, 1000)).to.be.closeTo(0.632, 0.01)
      })

      it('returns 0 for 0 tests', () => {
        expect(detectionProbability(0.01, 0)).to.equal(0)
      })

      it('approaches 1 for large test counts', () => {
        expect(detectionProbability(0.01, 10000)).to.be.greaterThan(0.9999)
      })

      it('higher failure rate means higher detection', () => {
        const p1 = detectionProbability(0.001, 500)
        const p2 = detectionProbability(0.01, 500)
        const p3 = detectionProbability(0.1, 500)
        expect(p1).to.be.lessThan(p2)
        expect(p2).to.be.lessThan(p3)
      })

      it('throws on invalid inputs', () => {
        expect(() => detectionProbability(0, 100)).to.throw()
        expect(() => detectionProbability(-0.1, 100)).to.throw()
        expect(() => detectionProbability(0.01, -1)).to.throw()
      })
    })
  })
})
