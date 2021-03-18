import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('finds two elements such that a % 11 == 0', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .defaultStrategy()
        .withAdvancedConstantExtraction()
      )
      .exists('a', fc.integer(0, 1000000))
      .then(({a}) => a % 11 === 0 && a > 90000 && a < 90010)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 90002}})
  })

  it('Dumb Test #1: test that proves that constant extraction can be very powerfull', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .withRandomSampling()
        .withBasicConstantExtraction()
      ) // Comment configuration to run with default strategy
      .exists('a', fc.integer())
      .then(({a}) => a === 10)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 10}})
  })

  it('Dumb Test #2: test that proves that constant extraction can be very powerfull', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .withRandomSampling()
        .withSampleSize(100)
        .withAdvancedConstantExtraction()
      )
      .exists('a', fc.string())
      .forall('b', fc.string())
      .exists('c', fc.string())
      .then(({a, b, c}) => a.concat(b).concat(c).includes('before-' && '-after'))
      .check()
    ).to.deep.include({satisfiable: true})
  })
})
