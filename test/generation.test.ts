import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'
import {Arbitrary} from '../src/arbitraries'

describe('Generation tests', () => {
  it('Generator propagates without seed specification', () => {
    const sc = fc.scenario()

    expect(sc.generator === sc.forall('a', fc.integer(-10, 10)).generator).to.be.true
    expect(sc.generator === sc.forall('a', fc.integer(-10, 10)).forall('b', fc.integer(-10, 10)).generator).to.be.true
  })

  it('Generator propagates to arbitraries without seed specification', () => {
    const sc = fc.scenario()

    const arb1: Arbitrary<number>= fc.integer(-10, 10)
    sc.forall('a', arb1)
    expect(sc.generator === arb1.generator).to.be.true

    const arb2: Arbitrary<number> = fc.integer(-10, 10)
    const arb3: Arbitrary<number> = fc.integer(-10, 10)
    sc.forall('a', arb2).forall('b', arb3)
    expect(sc.generator === arb2.generator).to.be.true
    expect(sc.generator === arb3.generator).to.be.true
  })

  it('Generator propagates with seed specification', () => {
    const sc = fc.scenario()
    expect(sc.withSeed('aaa').generator === sc.generator).to.be.true

    const sc2 = sc.forall('a', fc.integer(-10, 10))
    expect(sc2.withSeed('aaa').generator === sc.generator).to.be.true
    expect(sc2.withSeed('aaa').generator === sc2.generator).to.be.true
  })

  it('Generator propagates to arbitraries with seed specification', () => {
    const arb1: Arbitrary<number> = fc.integer(-10, 10)
    const arb2: Arbitrary<number> = fc.integer(-10, 10)
    const fs = fc.scenario().forall('a', arb1).withSeed('aaa').forall('b', arb2)

    expect(fs.generator === arb1.generator).to.be.true
    expect(fs.generator === arb2.generator).to.be.true
  })
})
