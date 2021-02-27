import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('finds if additions is associative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => (a + b) + c === a + (b + c))
      .check()
    ).to.have.property('satisfiable', true)
  })
})
