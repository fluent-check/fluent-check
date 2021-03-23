import {BetaBinomialDistribution, IntegerDistribution} from '../src/statistics'
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
})
