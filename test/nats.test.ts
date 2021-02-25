import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Nat tests', () => {
  it('should return a NoArbitrary if the bounds are invalid', () => {
    expect(
      fc.scenario()
        .forall('a', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('b', fc.integer(0, Number.MAX_SAFE_INTEGER))
        .then(({a, b}) => fc.nat(a, b) === fc.empty())
        .check()
    ).to.have.property('satisfiable', true)
  })
})
