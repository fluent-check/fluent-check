import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Nat tests', () => {
  it('should return a valid range if min < 0', () => {
    expect(
      fc.scenario()
        .forall('a', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .forall('b', fc.integer(0, Number.MAX_SAFE_INTEGER))
        .then(({a, b}) => fc.nat(a, b).sample(10).every(i => i.value >= 0))
        .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return a NoArbitrary if max < 0', () => {
    expect(
      fc.scenario()
        .forall('a', fc.integer())
        .forall('b', fc.integer(Number.MIN_SAFE_INTEGER, -1))
        .then(({a, b}) => fc.nat(a, b) === fc.empty())
        .check()
    ).to.have.property('satisfiable', true)
  })
})
