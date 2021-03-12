import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

const prng = function (seed: number): () => number {
  return () => {
    return seed = seed * 16807 % 2147483647
  }
}

describe('Generation tests', () => {
  it('Generator propagates without generator specification', () => {
    const sc = fc.scenario()

    expect(sc.prng.generator === sc.forall('a', fc.integer(-10, 10)).prng.generator).to.be.true
    expect(sc.prng.generator ===
      sc.forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10)).prng.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries without generator specification', () => {
    const sc1 = fc.scenario().forall('a', fc.integer(-10, 10))
    const sc2 = sc1.forall('b', fc.integer(-10, 10))

    expect(sc1.getCache()).to.not.eql(sc2.getCache())
  })

  it('Generator propagates with generator specification', () => {
    const sc = fc.scenario()
    const sc2 = sc.withGenerator(prng)
    expect(sc2.prng.generator === sc.prng.generator).to.be.true

    const sc3 = sc2.forall('a', fc.integer(-10, 10))
    expect(sc2.prng.generator === sc3.prng.generator).to.be.true

    const sc4 = sc3.forall('b', fc.integer(-10, 10))
    expect(sc3.prng.generator === sc4.prng.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries with generator specification', () => {
    const sc1 = fc.scenario().withGenerator(prng).forall('a', fc.integer(-10, 10))
    const sc2 = sc1.forall('b', fc.integer(-10, 10))

    expect(sc1.getCache()).to.not.eql(sc2.getCache())
  })

  it('Generator generates same values in two runs with the same seed', () => {
    const sc1 = fc.scenario().withGenerator(prng, 1234).forall('a', fc.integer(-10, 10))
    const sc2 = sc1.forall('b', fc.integer(-10, 10))

    const sc3 = fc.scenario().withGenerator(prng, 1234).forall('a', fc.integer(-10, 10))
    const sc4 = sc3.forall('b', fc.integer(-10, 10))
    expect(sc1.getCache()).to.have.deep.members(sc3.getCache())
    expect(sc2.getCache()).to.have.deep.members(sc4.getCache())
  })
})
