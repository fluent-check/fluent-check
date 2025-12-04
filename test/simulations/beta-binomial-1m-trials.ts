import {BetaBinomialDistribution} from '../../src/statistics.js'
import {describe, it} from 'mocha'
import {expect} from 'chai'
import jstat from 'jstat'

/**
 * High-precision Beta vs Beta-Binomial comparison with 1,000,000 trials
 * This provides statistical precision to make informed design decisions
 */

function randomBinomial(k: number, p: number): number {
  let successes = 0
  for (let i = 0; i < k; i++) {
    if (Math.random() < p) successes++
  }
  return successes
}

function betaInv(p: number, alpha: number, beta: number): number {
  return jstat.beta.inv(p, alpha, beta)
}

function betaBinomialInv(p: number, n: number, alpha: number, beta: number): number {
  const dist = new BetaBinomialDistribution(n, alpha, beta)
  return dist.inv(p)
}

describe('Beta vs Beta-Binomial: 1 Million Trial Analysis', () => {
  it('should compare Beta and Beta-Binomial with high statistical precision', function () {
    this.timeout(600000) // 10 minutes for 1M trials

    const numTrials = 1000000
    const testCases = [
      {n: 10, p: 0.1, k: 20, description: 'Very small n, low proportion'},
      {n: 10, p: 0.5, k: 20, description: 'Very small n, moderate proportion'},
      {n: 20, p: 0.3, k: 20, description: 'Small n, moderate proportion'},
      {n: 30, p: 0.3, k: 20, description: 'Medium-small n'},
      {n: 50, p: 0.3, k: 20, description: 'Medium n'},
      {n: 100, p: 0.3, k: 20, description: 'Large n (threshold)'}
    ]

    const results: Array<{
      n: number
      p: number
      description: string
      betaCoverage: number
      bbCoverage: number
      coverageDiff: number
      coverageDiffPercent: number
      betaMSE: number
      bbMSE: number
      mseDiff: number
      mseImprovementPercent: number
    }> = []

    console.log(`\nRunning ${numTrials.toLocaleString()} trials for each test case...\n`)

    for (const {n, p, k, description} of testCases) {
      console.log(`Testing: ${description} (n=${n}, p=${p}, k=${k})`)
      const startTime = Date.now()

      let betaCoverage = 0
      let betaBinomialCoverage = 0
      let betaMSE = 0
      let betaBinomialMSE = 0
      const trueFilteredSize = Math.round(n * p)

      // Progress indicator
      const progressInterval = Math.floor(numTrials / 10)

      for (let trial = 0; trial < numTrials; trial++) {
        if (trial % progressInterval === 0 && trial > 0) {
          const progress = ((trial / numTrials) * 100).toFixed(1)
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
          process.stdout.write(`\r  Progress: ${progress}% (${elapsed}s)`)
        }

        // Simulate sampling
        const s = randomBinomial(k, p)
        const alpha = 1 + s
        const beta = 1 + k - s

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

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`\r  Completed in ${elapsed}s`)

      const betaCoverageRate = betaCoverage / numTrials
      const bbCoverageRate = betaBinomialCoverage / numTrials
      const betaMSERate = betaMSE / numTrials
      const bbMSERate = betaBinomialMSE / numTrials
      const coverageDiff = bbCoverageRate - betaCoverageRate
      const mseDiff = betaMSERate - bbMSERate
      const mseImprovement = betaMSERate > 0 ? (mseDiff / betaMSERate) * 100 : 0

      results.push({
        n,
        p,
        description,
        betaCoverage: betaCoverageRate,
        bbCoverage: bbCoverageRate,
        coverageDiff,
        coverageDiffPercent: coverageDiff * 100,
        betaMSE: betaMSERate,
        bbMSE: bbMSERate,
        mseDiff,
        mseImprovementPercent: mseImprovement
      })

      console.log(`  Beta Coverage: ${(betaCoverageRate * 100).toFixed(3)}%`)
      console.log(`  BB Coverage: ${(bbCoverageRate * 100).toFixed(3)}%`)
      console.log(`  Coverage Improvement: ${(coverageDiff * 100).toFixed(3)}%`)
      console.log(`  Beta MSE: ${betaMSERate.toFixed(4)}`)
      console.log(`  BB MSE: ${bbMSERate.toFixed(4)}`)
      console.log(`  MSE Change: ${mseImprovement.toFixed(2)}%\n`)
    }

    // Summary table
    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY: Beta vs Beta-Binomial Comparison (1,000,000 trials)')
    console.log('='.repeat(80))
    console.log('n  | p   | Beta Coverage | BB Coverage | Coverage Δ | Beta MSE | BB MSE  | MSE Δ')
    console.log('-'.repeat(80))
    for (const r of results) {
      const covDiffStr = r.coverageDiffPercent.toFixed(3)
      const coverageDelta = r.coverageDiffPercent >= 0 ? `+${covDiffStr}` : covDiffStr
      const mseDiffStr = r.mseImprovementPercent.toFixed(2)
      const mseDelta = r.mseImprovementPercent >= 0 ? `+${mseDiffStr}` : mseDiffStr
      console.log(
        `${r.n.toString().padStart(3)} | ${r.p.toFixed(2)} | ${(r.betaCoverage * 100).toFixed(3).padStart(11)}% | ` +
        `${(r.bbCoverage * 100).toFixed(3).padStart(10)}% | ${coverageDelta.padStart(10)}% | ` +
        `${r.betaMSE.toFixed(4).padStart(8)} | ${r.bbMSE.toFixed(4).padStart(7)} | ${mseDelta.padStart(5)}%`
      )
    }
    console.log('='.repeat(80) + '\n')

    // Key findings
    console.log('KEY FINDINGS:')
    console.log('-'.repeat(80))

    // Find cases where Beta-Binomial significantly improves coverage
    const significantCoverage = results.filter(r => r.coverageDiffPercent > 1.0)
    if (significantCoverage.length > 0) {
      console.log('\nCases with >1% coverage improvement:')
      significantCoverage.forEach(r => {
        console.log(`  n=${r.n}, p=${r.p}: +${r.coverageDiffPercent.toFixed(3)}% coverage`)
      })
    }

    // Find cases where Beta-Binomial improves MSE
    const mseImprovements = results.filter(r => r.mseImprovementPercent > 0)
    if (mseImprovements.length > 0) {
      console.log('\nCases where Beta-Binomial improves MSE:')
      mseImprovements.forEach(r => {
        console.log(`  n=${r.n}, p=${r.p}: +${r.mseImprovementPercent.toFixed(2)}% MSE improvement`)
      })
    }

    // Find cases where Beta-Binomial worsens MSE
    const mseWorsenings = results.filter(r => r.mseImprovementPercent < -2.0)
    if (mseWorsenings.length > 0) {
      console.log('\nCases where Beta-Binomial significantly worsens MSE (>2%):')
      mseWorsenings.forEach(r => {
        console.log(`  n=${r.n}, p=${r.p}: ${r.mseImprovementPercent.toFixed(2)}% MSE (worse)`)
      })
    }

    // Threshold analysis
    console.log('\nTHRESHOLD ANALYSIS:')
    console.log('-'.repeat(80))
    const n10 = results.find(r => r.n === 10)
    const n20 = results.find(r => r.n === 20)
    const n30 = results.find(r => r.n === 30)
    const n50 = results.find(r => r.n === 50)
    const n100 = results.find(r => r.n === 100)

    if (n10 !== undefined) {
      const mseSign = n10.mseImprovementPercent >= 0 ? '+' : ''
      const benefit = n10.coverageDiffPercent > 0.5 ? 'Clear' : 'Marginal'
      console.log(`n=10: Coverage +${n10.coverageDiffPercent.toFixed(3)}%, MSE ${mseSign}${n10.mseImprovementPercent.toFixed(2)}%`)
      console.log(`  → Cost: 1.5x, Benefit: ${benefit}`)
    }
    if (n20 !== undefined) {
      const mseSign = n20.mseImprovementPercent >= 0 ? '+' : ''
      const benefit = n20.coverageDiffPercent > 1.0 ? 'Clear' : 'Marginal'
      console.log(`n=20: Coverage +${n20.coverageDiffPercent.toFixed(3)}%, MSE ${mseSign}${n20.mseImprovementPercent.toFixed(2)}%`)
      console.log(`  → Cost: 2.0x, Benefit: ${benefit}`)
    }
    if (n30 !== undefined) {
      const mseSign = n30.mseImprovementPercent >= 0 ? '+' : ''
      const benefit = n30.coverageDiffPercent > 1.0 ? 'Moderate' : 'Marginal'
      console.log(`n=30: Coverage +${n30.coverageDiffPercent.toFixed(3)}%, MSE ${mseSign}${n30.mseImprovementPercent.toFixed(2)}%`)
      console.log(`  → Cost: 5.0x, Benefit: ${benefit}`)
    }
    if (n50 !== undefined) {
      const mseSign = n50.mseImprovementPercent >= 0 ? '+' : ''
      const benefit = n50.coverageDiffPercent > 1.0 ? 'Moderate' : 'Questionable'
      console.log(`n=50: Coverage +${n50.coverageDiffPercent.toFixed(3)}%, MSE ${mseSign}${n50.mseImprovementPercent.toFixed(2)}%`)
      console.log(`  → Cost: 6.5x, Benefit: ${benefit}`)
    }
    if (n100 !== undefined) {
      const mseSign = n100.mseImprovementPercent >= 0 ? '+' : ''
      const benefit = n100.coverageDiffPercent > 0.5 ? 'Marginal' : 'Negligible'
      console.log(`n=100: Coverage +${n100.coverageDiffPercent.toFixed(3)}%, MSE ${mseSign}${n100.mseImprovementPercent.toFixed(2)}%`)
      console.log(`  → Cost: 10.5x, Benefit: ${benefit}`)
    }

    console.log('\n' + '='.repeat(80))

    // Basic assertions to ensure we got valid results
    expect(results.length).to.equal(testCases.length)
    for (const r of results) {
      expect(r.betaCoverage).to.be.at.least(0.9) // At least 90% coverage
      expect(r.bbCoverage).to.be.at.least(0.9)
    }
  })
})
