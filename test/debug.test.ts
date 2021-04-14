import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('#1 Simple property test.', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(1, 3))
      .exists('b', fc.integer(1, 4))
      .then(({a, b}) => b <= a)
      .check()
    ).to.have.property('satisfiable', true)
  })
})
