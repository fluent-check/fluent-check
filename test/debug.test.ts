import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
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
