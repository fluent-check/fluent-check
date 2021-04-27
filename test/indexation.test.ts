import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Indexation tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Array index is calculated correctly', () => {
    // generates [-4, -2] which index should be -4 + 21 * (-2) = -46
    const arb = fc.array(fc.integer(-10, 10), 2, 3).pick(prng(1234)) ?? {index: 0}
    expect(arb.index).to.equal(-46)
  })

  it('Integer index is calculated correctly', () => {
    // generates -9
    const arb = fc.integer(-10, 10).pick(prng(9999)) ?? {index: 0}
    expect(arb.index).to.equal(-9)
  })

  it('Real index is calculated correctly', () => {
    // requires change in code so pick receives the used precision and can accurately index
    const arb = fc.real(0, 1).pick(prng(1234)) ?? {index: 0}
    expect(arb.index).to.equal(0.009657739666131204)
  })

  it('Set index is calculated correctly', () => {
    // generates [1,2,3], which is combination number 14 of the set 2**1 + 2**2 + 2**3
    const arb = fc.set([0, 1, 2, 3]).pick(prng(289999999)) ?? {index: 0}
    expect(arb.index).to.equal(14)
  })

  it('Tuple index is calculated correctly', () => {
    // generates [3, -1], which index should be 3 + 21 * (-1) = -18
    const arb = fc.tuple(fc.integer(-10, 10), fc.integer(-10, 10)).pick(prng(289999999)) ?? {index: 0}
    expect(arb.index).to.equal(-18)
  })

  it('Input scenario indexes are calculated correctly', () => {
    // generates { a: 3, b: -12, c: -6 } which should be 3 - 12 * 21 - 6 * 41 * 21 = -5415
    const rep = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withTestCaseOutput().withGraphics()) //so we have access to the indexes
      .withGenerator(prng, 1234567)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-20, 20))
      .forall('c', fc.integer(-30, 30))
      .then(({a, b, c}) => a + b + c === a + b + c)
      .check()

    expect(rep.inputScenarioIndexes[0]).to.equal(-5415)
  })
})
