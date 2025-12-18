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
import {it} from 'mocha'
import {expect} from 'chai'
import stats from 'jstat'

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
          const dist = new TestBinomialDistribution(trials, p)
          prop(dist, trials, p)
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
      testProp((dist, _trials, _p) =>
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
    it('defines the mean as a constant-time closed form expression', () => {
      const check = (trials: number, a: number, b: number, expected: number) =>
        expect(new BetaBinomialDistribution(trials, a, b).mean()).to.be.closeTo(expected, deltaFor(expected))

      check(1234, 4.5, 3.5, 694.125)
      check(31234, 1.0, 1.0, 15617.0)
      check(31234, 0.4, 1.0, 8924.0)
      check(31234, 1.0, 0.5, 20822.666666667)
      check(31234, 1.4, 1.0, 18219.833333333)
      check(31234, 1.0, 1.5, 12493.6)
      check(31234, 0.4, 0.5, 13881.777777778)
      check(31234, 0.4, 1.5, 6575.57894733406)
      check(31234, 1.4, 0.5, 23014.526315792507)
      check(31234, 1.4, 1.5, 15078.482758214723)
      check(31234, 47.5, 92.5, 10597.3)
      check(312349, 6.2, 52.5, 32990.9)
      check(312364973, 10483.2, 24681.3, 9.312188385882352e7)
    })

    it('defines the mode as a constant-time closed form expression', () => {
      const check = (trials: number, a: number, b: number, expected: number) =>
        expect(new BetaBinomialDistribution(trials, a, b).mode()).to.be.closeTo(expected, deltaFor(expected))

      check(1234, 4.5, 3.5, 720)
      check(31234, 1.0, 1.0, 0)
      check(31234, 0.4, 1.0, 0)
      check(31234, 1.0, 0.5, 31234)
      check(31234, 1.4, 1.0, 31234)
      check(31234, 1.0, 1.5, 0)
      check(31234, 0.4, 0.5, 0)
      check(31234, 0.4, 1.5, 0)
      check(31234, 1.4, 0.5, 31234)
      check(31234, 1.4, 1.5, 13882)
      check(31234, 47.5, 92.5, 10524)
      check(312349, 6.2, 52.5, 28645)
      check(312364973, 10483.2, 24681.3, 93118643)
    })

    it('defines a PDF consistent with its mean definition', () => {
      [...Array(100)].forEach((_, n) => {
        const dist = new BetaBinomialDistribution(n, Math.random() * 20, Math.random() * 20)
        const pdfMean = [...Array(n + 1)].reduce((acc, _, i) => acc + dist.pdf(i) * i, 0)
        expect(pdfMean).to.be.closeTo(dist.mean(), deltaFor(dist.mean()))
      })
    })
  })

  describe('FluentStatistics', () => {
    describe('testsRun', () => {
      it('should equal sample size when all tests execute for satisfiable forall property', () => {
        const sampleSize = 100
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0) // Always true, no preconditions
          .check()

        expect(result.satisfiable).to.be.true
        expect(result.statistics.testsRun).to.equal(sampleSize)
      })

      it('should count exact number of tests executed before counterexample is found', () => {
        // Use a deterministic seed to ensure consistent behavior
        let callCount = 0
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(1000))
          .withGenerator(() => {
            let count = 0
            return () => {
              count++
              // Return value that produces counterexample on exactly 7th call
              return count <= 7 ? 0.5 : 0.9
            }
          }, 12345)
          .forall('x', fc.integer(0, 10))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            callCount++
            // Fail on 7th test
            return callCount !== 7
          })
          .check()

        expect(result.satisfiable).to.be.false
        expect(result.statistics.testsRun).to.equal(7)
        expect(callCount).to.equal(7)
      })

      it('should count tests until witness is found for exists quantifier', () => {
        // Exists stops on first witness, so testsRun should be less than sampleSize
        const sampleSize = 1000
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .exists('x', fc.integer(0, 100))
          .then(({x}) => x === 42) // Witness exists, will be found
          .check()

        expect(result.satisfiable).to.be.true
        // Should find witness before exhausting budget
        expect(result.statistics.testsRun).to.be.greaterThan(0)
        expect(result.statistics.testsRun).to.be.at.most(sampleSize)
      })

      it('should count all attempted tests including discarded ones', () => {
        const sampleSize = 100
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            fc.pre(x % 3 === 0) // Discard ~2/3 of tests
            return true // Always pass for non-discarded tests
          })
          .check()

        expect(result.satisfiable).to.be.true
        // testsRun includes both passed and discarded
        expect(result.statistics.testsRun).to.equal(sampleSize)
        expect(result.statistics.testsDiscarded).to.be.greaterThan(0)
        expect(result.statistics.testsPassed).to.be.lessThan(sampleSize)
      })
    })

    describe('testsPassed', () => {
      it('should equal testsRun when all tests pass with no preconditions', () => {
        const sampleSize = 75
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x * 0 === 0) // Always true, no preconditions
          .check()

        expect(result.satisfiable).to.be.true
        expect(result.statistics.testsPassed).to.equal(sampleSize)
        expect(result.statistics.testsRun).to.equal(sampleSize)
        expect(result.statistics.testsDiscarded).to.equal(0)
      })

      it('should exactly equal testsRun - testsDiscarded for satisfiable property', () => {
        const sampleSize = 200
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            fc.pre(x < 50) // Discard approximately half
            return true // Always pass for non-discarded
          })
          .check()

        expect(result.satisfiable).to.be.true
        // This must be exact equality, not <=
        expect(result.statistics.testsPassed).to.equal(
          result.statistics.testsRun - result.statistics.testsDiscarded
        )
        // Verify non-trivial values (not all 0s)
        expect(result.statistics.testsDiscarded).to.be.greaterThan(0)
        expect(result.statistics.testsPassed).to.be.greaterThan(0)
      })

      it('should be exactly 0 when counterexample is found immediately', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(150))
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x < 0) // Always false - fails immediately
          .check()

        expect(result.satisfiable).to.be.false
        expect(result.statistics.testsPassed).to.equal(0)
        expect(result.statistics.testsRun).to.equal(1) // Only the failing test
        expect(result.statistics.testsDiscarded).to.equal(0) // No preconditions
      })

      it('should count passing tests before counterexample for unsatisfiable property', () => {
        // Use a deterministic failing property
        let testCount = 0
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(200))
          .forall('x', fc.integer(0, 100))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            testCount++
            // Fail on 10th test to ensure we have passing tests before
            return testCount !== 10
          })
          .check()

        expect(result.satisfiable).to.be.false
        // Should have 9 passed tests before the 10th failing one
        expect(result.statistics.testsPassed).to.equal(9)
        // testsRun = testsPassed + testsDiscarded + 1 (counterexample)
        expect(result.statistics.testsRun).to.equal(
          result.statistics.testsPassed + result.statistics.testsDiscarded + 1
        )
        expect(result.statistics.testsDiscarded).to.equal(0) // No preconditions
      })

      it('should count only non-discarded passing tests', () => {
        const sampleSize = 150
        let passedCount = 0
        let discardedCount = 0

        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            if (x % 4 === 0) {
              discardedCount++
              fc.pre(false) // Discard ~25% of tests
            }
            passedCount++
            return true // All non-discarded tests pass
          })
          .check()

        expect(result.satisfiable).to.be.true
        expect(result.statistics.testsPassed).to.equal(passedCount)
        expect(result.statistics.testsDiscarded).to.equal(discardedCount)
        expect(passedCount + discardedCount).to.equal(sampleSize)
      })
    })

    describe('testsDiscarded', () => {
      it('should always equal the skipped field', () => {
        // Test with actual preconditions that cause skipping
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(100))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            fc.pre(x % 2 === 0) // Discard odd numbers
            return true
          })
          .check()

        expect(result.statistics.testsDiscarded).to.equal(result.skipped)
        expect(result.skipped).to.be.greaterThan(0) // Verify actual discarding occurred
      })

      it('should be exactly 0 when no preconditions filter tests', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(50))
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0) // No preconditions
          .check()

        expect(result.statistics.testsDiscarded).to.equal(0)
        expect(result.skipped).to.equal(0)
      })

      it('should count all tests rejected by preconditions', () => {
        const sampleSize = 300
        let preCallCount = 0

        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            if (x % 5 !== 0) {
              preCallCount++
              fc.pre(false) // Reject ~80% of tests
            }
            return true
          })
          .check()

        expect(result.satisfiable).to.be.true
        expect(result.statistics.testsDiscarded).to.equal(preCallCount)
        expect(result.statistics.testsDiscarded).to.be.greaterThan(sampleSize * 0.6) // At least 60%
      })

      it('should track discards even when property becomes unsatisfiable', () => {
        let testCount = 0
        let discardCount = 0  // eslint-disable-line @typescript-eslint/no-unused-vars
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(100))
          .forall('x', fc.integer(0, 100))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            testCount++
            // Discard tests 3, 7, 11 (create some gaps)
            if (testCount === 3 || testCount === 7 || testCount === 11) {
              discardCount++
              fc.pre(false)
            }
            // Fail on test 15
            return testCount !== 15
          })
          .check()

        expect(result.satisfiable).to.be.false
        // Should have discarded 3 tests before the counterexample
        expect(result.statistics.testsDiscarded).to.equal(3)
        expect(result.statistics.testsPassed).to.equal(11) // 15 total - 3 discarded - 1 failed
        expect(result.statistics.testsRun).to.equal(15)
      })
    })

    describe('executionTimeMs', () => {
      it('should be a non-negative number', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(10))
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0)
          .check()

        expect(result.statistics.executionTimeMs).to.be.a('number')
        expect(result.statistics.executionTimeMs).to.be.at.least(0)
      })

      it('should measure actual wall-clock time within reasonable bounds', () => {
        const delayMs = 50
        const tolerance = 20 // ms

        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(1))
          .forall('x', fc.constant(1))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            // Busy wait for delayMs
            const start = Date.now()
            while (Date.now() - start < delayMs) {
              // Busy loop
            }
            return true
          })
          .check()

        // Should be at least delayMs (minus small tolerance for measurement overhead)
        expect(result.statistics.executionTimeMs).to.be.at.least(delayMs - tolerance)
        // Should be less than delayMs * 3 (generous upper bound)
        expect(result.statistics.executionTimeMs).to.be.at.most(delayMs * 3)
      })

      it('should increase proportionally with sample size', () => {
        const workPerTest = 5 // ms of work per test

        const smallResult = fc.scenario()
          .config(fc.strategy().withSampleSize(5))
          .forall('x', fc.constant(1))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            const start = Date.now()
            while (Date.now() - start < workPerTest) { /* busy wait */ }
            return true
          })
          .check()

        const largeResult = fc.scenario()
          .config(fc.strategy().withSampleSize(20))
          .forall('x', fc.constant(1))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            const start = Date.now()
            while (Date.now() - start < workPerTest) { /* busy wait */ }
            return true
          })
          .check()

        // Large should take at least 3x longer (20/5 = 4, but allow variance)
        expect(largeResult.statistics.executionTimeMs).to.be.at.least(smallResult.statistics.executionTimeMs * 3)
      })

      it('should be less than 100ms for trivial fast tests', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(10))
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0) // Trivial, fast property
          .check()

        expect(result.statistics.executionTimeMs).to.be.at.most(100)
      })
    })

    describe('statistics consistency and invariants', () => {
      it('should satisfy testsRun = testsPassed + testsDiscarded for satisfiable results', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(150))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            fc.pre(x % 3 === 0) // Discard ~2/3
            return true
          })
          .check()

        expect(result.satisfiable).to.be.true
        // Must be exact equality
        expect(result.statistics.testsPassed + result.statistics.testsDiscarded)
          .to.equal(result.statistics.testsRun)
      })

      it('should satisfy invariant testsRun = testsPassed + testsDiscarded + 1 for unsatisfiable results', () => {
        // Use deterministic test to ensure counterexample is found
        let testCount = 0
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(200))
          .forall('x', fc.integer(0, 100))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            testCount++
            return testCount !== 15 // Fail on 15th test
          })
          .check()

        expect(result.satisfiable).to.be.false
        // The fundamental invariant: testsRun = passed + discarded + counterexample
        expect(result.statistics.testsRun).to.equal(
          result.statistics.testsPassed + result.statistics.testsDiscarded + 1
        )
        expect(result.statistics.testsPassed).to.equal(14) // 14 tests passed before failure
        expect(result.statistics.testsDiscarded).to.equal(0) // No preconditions
        expect(result.statistics.testsRun).to.equal(15) // 14 passed + 0 discarded + 1 failed
      })

      it('should maintain invariants with mixed preconditions and failures', () => {
        const sampleSize = 200
        let testCount = 0
        let passedCount = 0  // eslint-disable-line @typescript-eslint/no-unused-vars
        let discardedCount = 0

        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          .then(({x}) => {
            testCount++
            if (x % 2 === 1) {
              discardedCount++
              fc.pre(false) // Discard odds
            }
            // Fail on 20th non-discarded test (even number)
            const nonDiscardedCount = testCount - discardedCount
            if (nonDiscardedCount < 20) {
              passedCount++
            }
            return nonDiscardedCount !== 20
          })
          .check()

        expect(result.satisfiable).to.be.false
        expect(result.statistics.testsDiscarded).to.equal(discardedCount)
        expect(result.statistics.testsPassed).to.equal(19) // 19 passed before 20th even number failed
        // The fundamental invariant holds
        expect(result.statistics.testsRun).to.equal(
          result.statistics.testsPassed + result.statistics.testsDiscarded + 1
        )
      })

      it('should have all non-negative statistics', () => {
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(50))
          .forall('x', fc.integer(0, 10))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => true)
          .check()

        expect(result.statistics.testsRun).to.be.at.least(0)
        expect(result.statistics.testsPassed).to.be.at.least(0)
        expect(result.statistics.testsDiscarded).to.be.at.least(0)
        expect(result.statistics.executionTimeMs).to.be.at.least(0)
      })

      it('should handle edge case where all tests are discarded', () => {
        const sampleSize = 100
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .forall('x', fc.integer(0, 100))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .then(({x}) => {
            fc.pre(false) // Discard all tests
            return true
          })
          .check()

        expect(result.satisfiable).to.be.true // No counterexample found
        expect(result.statistics.testsRun).to.equal(sampleSize)
        expect(result.statistics.testsDiscarded).to.equal(sampleSize)
        expect(result.statistics.testsPassed).to.equal(0)
      })

      it('should handle exhausted exists scenario correctly (no counterexample found)', () => {
        const sampleSize = 50
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(sampleSize))
          .exists('x', fc.integer(0, 10))
          .then(({x}) => x > 1000) // Impossible condition - no witness exists
          .check()

        expect(result.satisfiable).to.be.false // No witness found
        expect(result.statistics.testsRun).to.equal(sampleSize)
        // All tests "passed" in the sense that none was a counterexample
        // (they just didn't satisfy the exists condition)
        expect(result.statistics.testsPassed).to.equal(sampleSize)
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

      const stats = aggregator.aggregate(input)

      expect(stats.testsRun).to.equal(100)
      expect(stats.testsDiscarded).to.equal(30)
      expect(stats.testsPassed).to.equal(70)
      expect(stats.testsRun).to.equal(stats.testsPassed + stats.testsDiscarded)
    })

    it('computes invariants for unsatisfiable results', () => {
      const input: StatisticsAggregationInput = {
        testsRun: 10,
        skipped: 2,
        executionTimeMs: 5,
        counterexampleFound: true,
        executionTimeBreakdown: {exploration: 5, shrinking: 0}
      }

      const stats = aggregator.aggregate(input)

      expect(stats.testsRun).to.equal(10)
      expect(stats.testsDiscarded).to.equal(2)
      expect(stats.testsPassed).to.equal(7)
      expect(stats.testsRun).to.equal(stats.testsPassed + stats.testsDiscarded + 1)
    })

    it('computes label and event percentages when data is present', () => {
      const detailedStats: DetailedExplorationStats = {
        events: {
          error: 4,
          success: 6
        }
      }
      const input: StatisticsAggregationInput = {
        testsRun: 10,
        skipped: 0,
        executionTimeMs: 0,
        counterexampleFound: false,
        executionTimeBreakdown: {exploration: 0, shrinking: 0},
        labels: {
          small: 7,
          large: 3
        },
        detailedStats
      }

      const stats = aggregator.aggregate(input)

      expect(stats.labels).to.deep.equal({small: 7, large: 3})
      expect(stats.labelPercentages).to.deep.equal({small: 70, large: 30})
      expect(stats.events).to.deep.equal({error: 4, success: 6})
      expect(stats.eventPercentages).to.deep.equal({error: 40, success: 60})
    })

    it('passes through detailed and shrinking statistics', () => {
      const arbitraryStats: Record<string, ArbitraryStatistics> = {
        x: {
          samplesGenerated: 10,
          uniqueValues: 3,
          cornerCases: {
            tested: [0],
            total: 1
          }
        }
      }
      const targets: Record<string, TargetStatistics> = {
        default: {
          best: 42,
          observations: 5,
          mean: 21
        }
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

      const stats = aggregator.aggregate(input)

      expect(stats.arbitraryStats).to.equal(arbitraryStats)
      expect(stats.events).to.deep.equal({hit: 2})
      expect(stats.targets).to.equal(targets)
      expect(stats.shrinking).to.deep.equal(shrinkingStats)
    })
  })

  describe('Statistical utility functions', () => {
    describe('sampleSizeForConfidence', () => {
      it('calculates required tests for 95% confidence at threshold 0.999', () => {
        const n = sampleSizeForConfidence(0.999, 0.95)
        // Verify that n successes gives at least 95% confidence
        const confidence = calculateBayesianConfidence(n, 0, 0.999)
        expect(confidence).to.be.at.least(0.95)
        // And n-1 gives less than 95% confidence
        const confidenceBefore = calculateBayesianConfidence(n - 1, 0, 0.999)
        expect(confidenceBefore).to.be.lessThan(0.95)
      })

      it('calculates required tests for 90% confidence at threshold 0.99', () => {
        const n = sampleSizeForConfidence(0.99, 0.90)
        const confidence = calculateBayesianConfidence(n, 0, 0.99)
        expect(confidence).to.be.at.least(0.90)
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

      it('throws on invalid threshold', () => {
        expect(() => sampleSizeForConfidence(0, 0.95)).to.throw()
        expect(() => sampleSizeForConfidence(1, 0.95)).to.throw()
        expect(() => sampleSizeForConfidence(-0.5, 0.95)).to.throw()
        expect(() => sampleSizeForConfidence(1.5, 0.95)).to.throw()
      })

      it('throws on invalid confidence', () => {
        expect(() => sampleSizeForConfidence(0.99, 0)).to.throw()
        expect(() => sampleSizeForConfidence(0.99, 1)).to.throw()
        expect(() => sampleSizeForConfidence(0.99, -0.5)).to.throw()
        expect(() => sampleSizeForConfidence(0.99, 1.5)).to.throw()
      })
    })

    describe('expectedTestsToDetectFailure', () => {
      it('returns 100 for 1% failure rate', () => {
        const expected = expectedTestsToDetectFailure(0.01)
        expect(expected).to.equal(100)
      })

      it('returns 1000 for 0.1% failure rate', () => {
        const expected = expectedTestsToDetectFailure(0.001)
        expect(expected).to.equal(1000)
      })

      it('returns 1 for 100% failure rate', () => {
        const expected = expectedTestsToDetectFailure(1.0)
        expect(expected).to.equal(1)
      })

      it('throws on invalid failure rate', () => {
        expect(() => expectedTestsToDetectFailure(0)).to.throw()
        expect(() => expectedTestsToDetectFailure(-0.1)).to.throw()
        expect(() => expectedTestsToDetectFailure(1.5)).to.throw()
      })
    })

    describe('detectionProbability', () => {
      it('calculates ~63% detection for 1% failure rate in 100 tests', () => {
        const p = detectionProbability(0.01, 100)
        // 1 - (0.99)^100 ≈ 0.634
        expect(p).to.be.closeTo(0.634, 0.01)
      })

      it('calculates ~63% detection for 0.1% failure rate in 1000 tests', () => {
        const p = detectionProbability(0.001, 1000)
        // 1 - (0.999)^1000 ≈ 0.632
        expect(p).to.be.closeTo(0.632, 0.01)
      })

      it('returns 0 for 0 tests', () => {
        const p = detectionProbability(0.01, 0)
        expect(p).to.equal(0)
      })

      it('returns ~1 for large number of tests with non-trivial failure rate', () => {
        const p = detectionProbability(0.01, 10000)
        expect(p).to.be.greaterThan(0.9999)
      })

      it('follows expected relationship: higher failure rate = higher detection', () => {
        const p1 = detectionProbability(0.001, 500)
        const p2 = detectionProbability(0.01, 500)
        const p3 = detectionProbability(0.1, 500)
        expect(p1).to.be.lessThan(p2)
        expect(p2).to.be.lessThan(p3)
      })

      it('throws on invalid failure rate', () => {
        expect(() => detectionProbability(0, 100)).to.throw()
        expect(() => detectionProbability(-0.1, 100)).to.throw()
        expect(() => detectionProbability(1.5, 100)).to.throw()
      })

      it('throws on invalid test count', () => {
        expect(() => detectionProbability(0.01, -1)).to.throw()
        expect(() => detectionProbability(0.01, 1.5)).to.throw()
      })
    })
  })
})
