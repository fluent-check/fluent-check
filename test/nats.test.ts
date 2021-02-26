import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Nat tests', () => {
  it('should return a valid range if min < 0', () => {
    expect(
      fc.scenario()
        .forall('n', fc.tuple(
          fc.integer(Number.MIN_SAFE_INTEGER, -1),
          fc.integer(0, Number.MAX_SAFE_INTEGER))
          .chain(([a, b]) => fc.nat(a, b)))
        .then(({n}) => n >= 0)
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
