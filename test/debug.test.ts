import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Boolean tests', () => {
  it('finds that subtraction is not cummutative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a - b === b - a)
      .check()
    ).to.deep.include({satisfiable: false, example: {a: 0, b: -1}})
  })
})
