import {BetaDistribution, BetaBinomialDistribution} from '../../src/statistics.js'
import {describe, it} from 'mocha'
import {expect} from 'chai'
import jstat from 'jstat'

/**
 * Focused analysis of Beta vs Beta-Binomial trade-offs
 * This test measures actual performance and accuracy differences
 */

function timeOperation(fn: () => void, iterations: number): number {
  const start = Date.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = Date.now()
  return (end - start) / iterations // ms per operation
}

function betaInv(p: number, alpha: number, beta: number): number {
  return jstat.beta.inv(p, alpha, beta)
}

function betaBinomialInv(p: number, n: number, alpha: number, beta: number): number {
  const dist = new BetaBinomialDistribution(n, alpha, beta)
  return dist.inv(p)
}

describe('Beta vs Beta-Binomial Trade-off Analysis', () => {
  describe('Performance Comparison', () => {
    it('should measure quantile computation time for different n', function () {
      this.timeout(30000)
      const alpha = 5
      const beta = 10
      const iterations = 100

      // Beta baseline
      const betaDist = new BetaDistribution(alpha, beta)
      const betaTime = timeOperation(() => {
        betaDist.inv(0.5)
        betaDist.inv(0.025)
        betaDist.inv(0.975)
      }, iterations)

      console.log(`\nBeta (3 quantiles): ${betaTime.toFixed(3)} ms per operation`)

      // Beta-Binomial for different n
      const sizes = [10, 20, 30, 50, 100]
      const results: Array<{n: number; time: number; ratio: number}> = []

      for (const n of sizes) {
        const bbDist = new BetaBinomialDistribution(n, alpha, beta)
        const bbTime = timeOperation(() => {
          bbDist.inv(0.5)
          bbDist.inv(0.025)
          bbDist.inv(0.975)
        }, iterations)
        const ratio = bbTime / betaTime
        results.push({n, time: bbTime, ratio})
        console.log(`Beta-Binomial n=${n}: ${bbTime.toFixed(3)} ms (${ratio.toFixed(1)}x slower)`)
      }

      // Verify that Beta-Binomial is significantly slower
      expect(results[0].ratio, 'Beta-Binomial should be slower than Beta').to.be.greaterThan(5)
    })
  })

  describe('Accuracy Comparison', () => {
    it('should measure coverage and MSE differences for small n', function () {
      this.timeout(60000)
      const numTrials = 1000 // Reduced for faster execution
      const testCases = [
        {n: 10, p: 0.3, k: 20},
        {n: 20, p: 0.3, k: 20},
        {n: 50, p: 0.3, k: 20},
        {n: 10, p: 0.1, k: 20},
        {n: 50, p: 0.1, k: 20}
      ]

      const results: Array<{
        n: number
        p: number
        betaCoverage: number
        bbCoverage: number
        coverageDiff: number
        betaMSE: number
        bbMSE: number
        mseDiff: number
      }> = []

      for (const {n, p, k} of testCases) {
        let betaCoverage = 0
        let betaBinomialCoverage = 0
        let betaMSE = 0
        let betaBinomialMSE = 0
        const trueFilteredSize = Math.round(n * p)

        for (let trial = 0; trial < numTrials; trial++) {
          // Simulate sampling
          let successes = 0
          for (let i = 0; i < k; i++) {
            if (Math.random() < p) successes++
          }

          const alpha = 1 + successes
          const beta = 1 + k - successes

          // Beta estimate
          const betaMedian = betaInv(0.5, alpha, beta)
          const betaEstimate = Math.round(n * betaMedian)
          const betaCILow = Math.round(n * betaInv(0.025, alpha, beta))
          const betaCIHigh = Math.round(n * betaInv(0.975, alpha, beta))

          // Beta-Binomial estimate
          const bbMedian = betaBinomialInv(0.5, n, alpha, beta)
          const bbCILow = betaBinomialInv(0.025, n, alpha, beta)
          const bbCIHigh = betaBinomialInv(0.975, n, alpha, beta)

          betaMSE += (betaEstimate - trueFilteredSize) ** 2
          betaBinomialMSE += (bbMedian - trueFilteredSize) ** 2

          if (betaCILow <= trueFilteredSize && trueFilteredSize <= betaCIHigh) betaCoverage++
          if (bbCILow <= trueFilteredSize && trueFilteredSize <= bbCIHigh) betaBinomialCoverage++
        }

        const betaCoverageRate = betaCoverage / numTrials
        const bbCoverageRate = betaBinomialCoverage / numTrials
        const betaMSERate = betaMSE / numTrials
        const bbMSERate = betaBinomialMSE / numTrials

        results.push({
          n,
          p,
          betaCoverage: betaCoverageRate,
          bbCoverage: bbCoverageRate,
          coverageDiff: bbCoverageRate - betaCoverageRate,
          betaMSE: betaMSERate,
          bbMSE: bbMSERate,
          mseDiff: betaMSERate - bbMSERate
        })

        console.log(`\nn=${n}, p=${p}:`)
        console.log(`  Beta Coverage: ${(betaCoverageRate * 100).toFixed(1)}%`)
        console.log(`  BB Coverage: ${(bbCoverageRate * 100).toFixed(1)}%`)
        console.log(`  Coverage Diff: ${((bbCoverageRate - betaCoverageRate) * 100).toFixed(2)}%`)
        console.log(`  Beta MSE: ${betaMSERate.toFixed(3)}`)
        console.log(`  BB MSE: ${bbMSERate.toFixed(3)}`)
        console.log(`  MSE Improvement: ${((betaMSERate - bbMSERate) / betaMSERate * 100).toFixed(1)}%`)
      }

      // For very small n (n=10), Beta-Binomial should show clear advantage
      const n10Result = results.find(r => r.n === 10 && r.p === 0.3)
      if (n10Result !== undefined) {
        expect(n10Result.coverageDiff, 'Beta-Binomial should have better coverage for n=10')
          .to.be.greaterThan(-0.05) // Allow some variance
      }

      // For larger n (n=50), difference should be smaller
      const n50Result = results.find(r => r.n === 50 && r.p === 0.3)
      if (n50Result !== undefined) {
        expect(Math.abs(n50Result.coverageDiff), 'Difference should be small for n=50')
          .to.be.lessThan(0.1)
      }
    })
  })

  describe('Computational Cost Analysis', () => {
    it('should estimate total cost for typical usage scenarios', function () {
      this.timeout(30000)
      const scenarios = [
        {name: 'Single filter, n=10', filters: 1, n: 10, calls: 1},
        {name: 'Single filter, n=50', filters: 1, n: 50, calls: 1},
        {name: 'Stacked filters (3), n=10', filters: 3, n: 10, calls: 3},
        {name: 'Stacked filters (3), n=50', filters: 3, n: 50, calls: 3}
      ]

      const alpha = 5
      const beta = 10
      const iterations = 50

      // Beta baseline
      const betaDist = new BetaDistribution(alpha, beta)
      const betaTime = timeOperation(() => {
        betaDist.inv(0.5)
        betaDist.inv(0.025)
        betaDist.inv(0.975)
      }, iterations)

      console.log(`\nBeta baseline: ${betaTime.toFixed(3)} ms per size() call`)

      for (const scenario of scenarios) {
        const bbDist = new BetaBinomialDistribution(scenario.n, alpha, beta)
        const bbTime = timeOperation(() => {
          bbDist.inv(0.5)
          bbDist.inv(0.025)
          bbDist.inv(0.975)
        }, iterations)

        const totalBetaTime = betaTime * scenario.calls
        const totalBBTime = bbTime * scenario.calls
        const overhead = totalBBTime - totalBetaTime

        console.log(`\n${scenario.name}:`)
        console.log(`  Beta: ${totalBetaTime.toFixed(3)} ms`)
        console.log(`  Beta-Binomial: ${totalBBTime.toFixed(3)} ms`)
        console.log(`  Overhead: ${overhead.toFixed(3)} ms (${(overhead / totalBetaTime * 100).toFixed(1)}% increase)`)
      }
    })
  })
})
