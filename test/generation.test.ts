import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Generation tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('The generator factory is working as expected', () => {
    const rng1 = prng(1)
    const rng2 = prng(1)

    const case1 = Array(10).fill(0).map(_ => rng1())
    const case2 = Array(10).fill(0).map(_ => rng2())
    const case3 = Array(10).fill(0).map(_ => rng1())

    expect(case1).to.eql(case2)
    expect(case1).to.not.eql(case3)
  })

  it('Sampling two similar arbitraries with the same rng produces the same values', () => {
    expect(fc.integer(-10, 10).sample(10, prng(1))).to.eql(fc.integer(-10, 10).sample(10, prng(1)))
  })

  it('Sampling two similar arbitraries with different rng produces different values', () => {
    expect(fc.integer(-10, 10).sample(10, prng(1))).to.not.eql(fc.integer(-10, 10).sample(10, prng(2)))
  })

  it('Generator generates different values for two similar arbitraries without generator specification', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a === b)
      .check()).to.have.property('satisfiable', false)
  })

  it('Generator generates different values for two similar arbitraries with generator specification', () => {
    expect(fc.scenario()
      .withGenerator(prng)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a === b)
      .check()).to.have.property('satisfiable', false)
  })

  it('Generator generates same values in two runs with the same seed', () => {
    const sc1 = fc.scenario()
      .configStatistics(fc.statistics().withTestCaseOutput())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a+b === b+a)

    const sc2 = fc.scenario()
      .configStatistics(fc.statistics().withTestCaseOutput())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a+b === b+a)

    expect(sc1.check().testCases).to.eql(sc2.check().testCases)
  })

  it('Generator generates same values in two runs of the same scenario', () => {
    const sc1 = fc.scenario()
      .configStatistics(fc.statistics().withTestCaseOutput())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a+b === b+a)

    expect(sc1.check().testCases).to.eql(sc1.check().testCases)
  })
})
