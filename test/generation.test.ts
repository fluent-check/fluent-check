import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'
import {FluentPick} from '../src/arbitraries'

const prng = function (seed: number): () => number {
  return () => {
    return seed = seed * 16807 % 2147483647
  }
}

function compareSamples(sample1: FluentPick<number>[], sample2: FluentPick<number>[]): boolean {
  for (let i = 0; i < sample1.length; i++) {
    if (sample1[i].value !== sample2[i].value || sample1[i].original !== sample2[i].original)
      return false
  }
  return true
}

describe('Generation tests', () => {
  it('Generator propagates without generator specification', () => {
    const sc = fc.scenario()

    expect(sc.prng.generator === sc.forall('a', fc.integer(-10, 10)).prng.generator).to.be.true
    expect(sc.prng.generator ===
      sc.forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10)).prng.generator).to.be.true
  })

  it('Generator propagates to arbitraries without generator specification', () => {
    const sc = fc.scenario()

    const arb1 = fc.integer(-10, 10)
    sc.forall('a', arb1)
    expect(sc.prng.generator === arb1.generator).to.be.true

    const arb2 = fc.integer(-10, 10)
    sc.forall('a', arb1).forall('b', arb2)
    expect(sc.prng.generator === arb1.generator).to.be.true
    expect(sc.prng.generator === arb2.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries without generator specification', () => {
    const arb1 = fc.integer(-10, 10)
    const arb2 = fc.integer(-10, 10)
    fc.scenario().forall('a', arb1).forall('b', arb2)

    expect(arb1.sampleUniqueWithBias() !== arb2.sampleUniqueWithBias()).to.be.true
  })

  it('Generator propagates with generator specification', () => {
    const sc = fc.scenario()
    expect(sc.withGenerator(prng).prng.generator === sc.prng.generator).to.be.true

    const sc2 = sc.forall('a', fc.integer(-10, 10))
    expect(sc2.withGenerator(prng).prng.generator === sc.prng.generator).to.be.true
    expect(sc2.withGenerator(prng).prng.generator === sc2.prng.generator).to.be.true
    expect(sc2.withGenerator(prng, 1234).prng.generator === sc.prng.generator).to.be.true
    expect(sc2.withGenerator(prng, 1234).prng.generator === sc2.prng.generator).to.be.true
  })

  it('Generator propagates to arbitraries with generation specification', () => {
    const arb1 = fc.integer(-10, 10)
    const arb2 = fc.integer(-10, 10)
    let fs = fc.scenario().forall('a', arb1).withGenerator(prng).forall('b', arb2)
    expect(fs.prng.generator === arb1.generator).to.be.true
    expect(fs.prng.generator === arb2.generator).to.be.true

    fs = fc.scenario().forall('a', arb1).withGenerator(prng, 1234).forall('b', arb2)
    expect(fs.prng.generator === arb1.generator).to.be.true
    expect(fs.prng.generator === arb2.generator).to.be.true
  })

  it('Generator generates different values for two similar arbitraries with generator specification', () => {
    const arb1 = fc.integer(-10, 10)
    const arb2 = fc.integer(-10, 10)
    fc.scenario().forall('a', arb1).withGenerator(prng).forall('b', arb2)

    expect(arb1.sampleUniqueWithBias() !== arb2.sampleUniqueWithBias()).to.be.true
  })

  it('Generator generates same values ine two runs with the same seed', () => {
    const arb1 = fc.integer(-10, 10)
    const arb2 = fc.integer(-10, 10)
    fc.scenario().forall('a', arb1).withGenerator(prng, 1234).forall('b', arb2)
    const sample1 = arb1.sampleUniqueWithBias()
    const sample2 = arb2.sampleUniqueWithBias()

    const arb3 = fc.integer(-10, 10)
    const arb4 = fc.integer(-10, 10)
    fc.scenario().forall('a', arb3).withGenerator(prng, 1234).forall('b', arb4)
    const sample3 = arb3.sampleUniqueWithBias()
    const sample4 = arb4.sampleUniqueWithBias()

    expect(compareSamples(sample1, sample3)).to.be.true
    expect(compareSamples(sample2, sample4)).to.be.true
  })
})
