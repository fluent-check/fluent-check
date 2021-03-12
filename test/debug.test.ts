import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('finds two elements such that a % 11 == 0', () => {
    // TODO: For this to pass, the shrink should perform an exhaustive search, otherwise the probability
    // of lying on the correct interval is very low.

    expect(fc.scenario()
      .config(fc.strategy()
        .defaultStrategy()
        .withConstantExtraction()
      )
      .exists('a', fc.integer(0, 1000000))
      .then(({a}) => a % 11 === 0 && a > 90000 && a < 90010)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 90002}})
  })

  it('dumb test that proves that finding an integer equal to 10 in a random way is VERY unlikely', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .withRandomSampling()
        .withConstantExtraction()
      ) // Comment configuration to run with default strategy
      .exists('a', fc.integer())
      .then(({a}) => a === 10)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 10}})
  })
})
