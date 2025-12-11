import {BetaBinomialDistribution, IntegerDistribution, type FluentStatistics} from '../src/statistics'
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
        let discardCount = 0
        const result = fc.scenario()
          .config(fc.strategy().withSampleSize(100))
          .forall('x', fc.integer(0, 100))
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
          .then(({x}) => {
            const start = Date.now()
            while (Date.now() - start < workPerTest) { /* busy wait */ }
            return true
          })
          .check()

        const largeResult = fc.scenario()
          .config(fc.strategy().withSampleSize(20))
          .forall('x', fc.constant(1))
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
        let passedCount = 0
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
})
