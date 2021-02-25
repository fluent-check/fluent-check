import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Nat tests', () => {
  it('finds that the sum of two natural numbers is greater or equal than 0', () => {
    expect(fc.scenario()
      .forall('a', fc.nat(-10, 10))
      .forall('b', fc.nat())
      .then(({a, b}) => a + b >= 0)
      .check()
    ).to.deep.include({satisfiable: true})
  })
})
