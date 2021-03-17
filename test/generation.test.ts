import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

const prng = function (seed: number): () => number {
  return () => {
    return (seed = seed * 16807 % 2147483647)/2147483647
  }
}

describe('Generation tests', () => {
  it('Generator propagates without generator specification', () => {
    const sc = fc.scenario()

    expect(sc.strategy.prng.generator === sc.forall('a', fc.integer(-10, 10)).strategy.prng.generator).to.be.true
    expect(sc.strategy.prng.generator ===
      sc.forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10)).strategy.prng.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries without generator specification', () => {
    const sc = fc.scenario().forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10))

    expect(sc.strategy.getCacheOfArbitrary('a')).to.not.be.undefined
    expect(sc.strategy.getCacheOfArbitrary('b')).to.not.be.undefined
    expect(sc.strategy.getCacheOfArbitrary('a')).to.not.eql(sc.strategy.getCacheOfArbitrary('b'))
  })

  it('Generator propagates with generator specification', () => {
    const sc = fc.scenario()
    const sc2 = sc.withGenerator(prng)
    expect(sc2.strategy.prng.generator === sc.strategy.prng.generator).to.be.true

    const sc3 = sc2.forall('a', fc.integer(-10, 10))
    expect(sc2.strategy.prng.generator === sc3.strategy.prng.generator).to.be.true

    const sc4 = sc3.forall('b', fc.integer(-10, 10))
    expect(sc3.strategy.prng.generator === sc4.strategy.prng.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries with generator specification', () => {
    const sc = fc.scenario().withGenerator(prng).forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10))

    expect(sc.strategy.getCacheOfArbitrary('a')).to.not.be.undefined
    expect(sc.strategy.getCacheOfArbitrary('b')).to.not.be.undefined
    expect(sc.strategy.getCacheOfArbitrary('a')).to.not.eql(sc.strategy.getCacheOfArbitrary('b'))
  })

  it('Generator generates same values in two runs with the same seed', () => {
    const sc1 = fc.scenario().withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10))
    const sc2 = fc.scenario().withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10))

    expect(sc1.strategy.getCacheOfArbitrary('a')).to.not.be.undefined
    expect(sc1.strategy.getCacheOfArbitrary('b')).to.not.be.undefined

    expect(sc2.strategy.getCacheOfArbitrary('a')).to.not.be.undefined
    expect(sc2.strategy.getCacheOfArbitrary('b')).to.not.be.undefined

    expect(sc1.strategy.getCacheOfArbitrary('a')).to.eql(sc2.strategy.getCacheOfArbitrary('a'))
    expect(sc1.strategy.getCacheOfArbitrary('b')).to.eql(sc2.strategy.getCacheOfArbitrary('b'))
  })

  it('Generator generates same values in two runs of the same scenario', () => {
    const sc = fc.scenario().config(fc.strategy().withRandomSampling().withBias().withShrinking().withoutReplacement())
      .withGenerator(prng, 1234).forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10))

    sc.then(({a, b}) => a+b === a+b).check()
    const collection1a = sc.strategy.arbitraries['a'].collection
    const collection1b = sc.strategy.arbitraries['b'].collection

    sc.then(({a, b}) => a+b === a+b).check()
    const collection2a = sc.strategy.arbitraries['a'].collection
    const collection2b = sc.strategy.arbitraries['b'].collection

    expect(collection1a).to.eql(collection2a)
    expect(collection1b).to.eql(collection2b)
  })
})
