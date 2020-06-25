import { it } from 'mocha'
import { expect } from 'chai'
import * as fc from '../src'
import { Arbitrary } from '../src/arbitraries'

describe('Confidence tests', function () {

  /**
   * The one true test to evaluate the confidence returned by an arbitrary, given the population
   * the arbitrary is sampling from and a sample size we want to try.
   *
   * This also works as the specification of confidence in this scenario: formally, the confidence
   * provided by an arbitrary is the probability that, when asked for a sample of a given size, the
   * returned sample will result in the correct conclusion about the truthness of the property.
   *
   * Since we treat the property to be checked as blackbox, the confidence must incorporate all the
   * possible properties the user will define (here we assume no biases are taking when "guessing"
   * that property). `population` is provided for whitebox testing purposes - the arbitrary is
   * assumed to have this information either in an exact or estimated form.
   */
  const expectCorrectConfidence = <A>(population: A[], arb: Arbitrary<A>, sampleSize: number) => {
    // Assuming that the arbitrary always returns the same confidence. Works for now, needs to be
    // rethought for filters.
    const confidence = arb.sample(sampleSize).confidence

    // Given a population, returns the set of all possible distinct properties (!).
    const allPropsFor = <A>(pop: A[]): ((a: A) => boolean)[] => {
      const revIndex = new Map(pop.map((a, i) => [a, i]))
      const arr: ((a: A) => boolean)[] = []
      for (let bitset = 0; bitset < 2 ** pop.length; bitset++) {
        arr.push(a => (bitset & (1 << revIndex.get(a)!)) !== 0)
      }
      return arr
    }

    // For all the possible properties for this population, take a sample of samples and accumulate
    // how many times we reached the right conclusion based on the sample.
    let cnt = 0, correctCnt = 0
    for (const prop of allPropsFor(population)) {
      const isPropTrue = population.every(prop)

      for (let i = 0; i < 1000; i++) {
        const items = arb.sample(sampleSize).items
        const isPropTrueInSample = items.map(v => v.value).every(prop)
        cnt++
        correctCnt += isPropTrue === isPropTrueInSample ? 1 : 0
      }
    }
    // Finally, compare the provided confidence with the success ratio found by simulation
    expect(confidence).to.be.closeTo(
      correctCnt / cnt, 0.1,
      `for population size ${population.length}, sample size ${sampleSize}`
    )
  }

  it('should provide correct confidences for integers', function () {
    this.timeout(10000)

    expectCorrectConfidence([0, 1], fc.integer(0, 1), 1)
    expectCorrectConfidence([0, 1], fc.integer(0, 1), 2)
    expectCorrectConfidence([0, 1, 2], fc.integer(0, 2), 1)
    expectCorrectConfidence([0, 1, 2], fc.integer(0, 2), 2)
    expectCorrectConfidence([0, 1, 2], fc.integer(0, 2), 3)
    expectCorrectConfidence([...Array(8).keys()], fc.integer(0, 7), 3)
    expectCorrectConfidence([...Array(8).keys()], fc.integer(0, 7), 7)
  })
})
