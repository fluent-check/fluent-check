import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Indexation tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Array index is calculated correctly', () => {
    const arb = fc.array(fc.integer(-10, 10), 2, 3)
    const pick = arb.pick(prng(123456)) ?? {index: -1}

    expect(pick.index).to.equal(1325)
    expect(arb.cornerCases().map(c => c.index)).to.eql([220, 5071, 0, 441, 440, 9701])
  })

  it('Integer index is calculated correctly', () => {
    const arb = fc.integer(-10, 10)
    const pick = fc.integer(-10, 10).pick(prng(9999)) ?? {index: -1}

    expect(pick.index).to.equal(1)
    expect(arb.cornerCases().map(c => c.index)).to.eql([10, 0, 20])
  })

  it('Real index is calculated correctly', () => {
    const arb = fc.real(-1, 1)
    const pick = arb.pick(prng(1234), 5) ?? {index: -1}

    expect(pick.index).to.equal(1931)
    expect(arb.cornerCases().map(c => c.index)).to.eql([1, 0, 2])
  })

  it('Set index is calculated correctly', () => {
    const arb = fc.set([0, 1, 2, 3])
    const pick = arb.pick(prng(289999999)) ?? {index: -1}

    expect(pick.index).to.equal(14)
    expect(arb.cornerCases().map(c => c.index)).to.eql([0, 15])
  })

  it('Tuple index is calculated correctly', () => {
    const arb = fc.tuple(fc.integer(-10, 10), fc.integer(-10, 10))
    const pick = arb.pick(prng(289999999)) ?? {index: -1}

    expect(pick.index).to.equal(202)
    expect(arb.cornerCases().map(c => c.index)).to.eql([220, 10, 430, 210, 0, 420, 230, 20, 440])
  })

  it('Input scenario indexes are calculated correctly', () => {
    const rep = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withTestCaseOutput().withGraphs()) //so we have access to the indexes
      .withGenerator(prng, 1234567)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-20, 20))
      .forall('c', fc.integer(-30, 30))
      .then(({a, b, c}) => a + b + c === a + b + c)
      .check()

    expect(rep.inputScenarioIndexes[0]).to.equal(20845)
  })
})
